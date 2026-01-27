// components/dashboard/useStockData.ts
import { useState, useEffect, useMemo, useRef } from "react";
import { FEES } from "./constants";
import { AnalyzedHolding, StockSummary, PortfolioSummary, MarketData, Holding, CashData } from "./types";

export function useStockData() {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cashData, setCashData] = useState<CashData>({ deposit: 0, cma: 0 });
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const lastFetchDateRef = useRef<string>("");

  // 1. 보유 주식 & 현금 데이터 로드 (API)
  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const res = await fetch('/api/holdings');
        if (res.ok) {
          const data = await res.json();
          setHoldings(data);
        }
      } catch (e) { console.error("Failed to fetch holdings", e); }
    };

    const fetchCash = async () => {
      try {
        const res = await fetch('/api/cash');
        if (res.ok) {
          const data = await res.json();
          setCashData(data);
        }
      } catch (e) { console.error("Failed to fetch cash", e); }
    }

    fetchHoldings();
    fetchCash();
  }, []);

  // ... (market data fetching logic remains same) ...
  // 2. 시장 데이터 로드 (holdings 변경 시 실행)
  useEffect(() => {
    if (holdings.length === 0) return;

    const uniqueCodes = Array.from(new Set(holdings.map((h) => h.code)));

    // 2-1. 전체 상세 데이터 (초기 로딩)
    const fetchAllDetails = async () => {
      try {
        const promises = uniqueCodes.map((code) =>
          fetch(`http://127.0.0.1:8000/stock/${code}`, { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : null))
            .catch((e) => null)
        );
        const results = await Promise.all(promises);

        setMarketData((prev) => {
          const newData = { ...prev };
          results.forEach((data: MarketData | null) => {
            if (data && data.ticker) newData[data.ticker] = data;
          });
          return newData;
        });
        lastFetchDateRef.current = new Date().toLocaleDateString();
      } catch (e) { console.error(e); }
    };

    // 2-2. 현재가 업데이트 (30초 주기)
    const fetchPricesOnly = async () => {
      try {
        const promises = uniqueCodes.map((code) =>
          fetch(`http://127.0.0.1:8000/price/${code}`)
            .then((res) => (res.ok ? res.json() : null))
            .catch((e) => null)
        );
        const results = await Promise.all(promises);

        setMarketData((prev) => {
          const nextState = { ...prev };
          results.forEach((data: any) => {
            if (data && data.ticker && nextState[data.ticker]) {
              nextState[data.ticker] = {
                ...nextState[data.ticker],
                price: data.price,
                change_rate: data.change_rate
              };
            }
          });
          setLastUpdate(new Date().toLocaleTimeString());
          return nextState;
        });
      } catch (e) { console.error(e); }
    };

    fetchAllDetails();
    const interval = setInterval(() => {
      const today = new Date().toLocaleDateString();
      lastFetchDateRef.current !== today ? fetchAllDetails() : fetchPricesOnly();
    }, 10000);

    return () => clearInterval(interval);
  }, [holdings]); // holdings가 로드된 후 실행


  // --- 핵심 계산 로직 ---
  const analyzedHoldings: AnalyzedHolding[] = useMemo(() => {
    return holdings.map((item) => {
      const marketInfo = marketData[item.code];
      // 데이터 없으면 기존 값 유지, 있으면 업데이트
      const currentPrice = marketInfo?.price || item.currentPrice;
      const change_rate = marketInfo?.change_rate || 0;

      const buyAmount = item.buyPrice * item.quantity;
      const currentAmount = currentPrice * item.quantity;

      const buyFee = buyAmount * FEES.BUY_FEE_RATE;
      const sellFee = currentAmount * FEES.SELL_FEE_RATE;
      const tax = currentAmount * FEES.TAX_RATE;
      const totalFees = Math.floor(buyFee + sellFee + tax);

      const grossProfit = currentAmount - buyAmount;
      const netProfit = grossProfit - totalFees;
      const returnRate = buyAmount > 0 ? ((netProfit / buyAmount) * 100).toFixed(2) : "0.00";

      return {
        ...item,
        currentPrice,
        buyAmount,
        currentAmount,
        totalFees,
        grossProfit,
        netProfit,
        returnRate,
        change_rate,
        per: marketInfo?.per,
        pbr: marketInfo?.pbr,
        dividend_yield: marketInfo?.dividend_yield,
        strategy: marketInfo?.strategy
      };
    });
  }, [holdings, marketData]);

  const stockSummaries: StockSummary[] = useMemo(() => {
    const summaryMap = new Map();
    analyzedHoldings.forEach((item) => {
      if (!summaryMap.has(item.code)) {
        summaryMap.set(item.code, {
          name: item.name,
          code: item.code,
          quantity: 0,
          buyAmount: 0,
          currentAmount: 0,
          totalFees: 0,
          currentPrice: item.currentPrice,
          change_rate: item.change_rate,
          strategy: item.strategy
        });
      }
      const stock = summaryMap.get(item.code);
      stock.quantity += item.quantity;
      stock.buyAmount += item.buyAmount;
      stock.currentAmount += item.currentAmount;
      stock.totalFees += item.totalFees;
      stock.currentPrice = item.currentPrice;
      stock.change_rate = item.change_rate;
      if (item.strategy) {
        stock.strategy = item.strategy;
      }
    });

    return Array.from(summaryMap.values()).map((stock: any) => {
      const grossProfit = stock.currentAmount - stock.buyAmount;
      const netProfit = grossProfit - stock.totalFees;
      const returnRate = stock.buyAmount > 0 ? ((netProfit / stock.buyAmount) * 100).toFixed(2) : "0.00";
      const avgBuyPrice = stock.quantity > 0 ? Math.floor(stock.buyAmount / stock.quantity) : 0;

      return { ...stock, avgBuyPrice, netProfit, returnRate };
    });
  }, [analyzedHoldings]);

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    const totalBuyAmount = analyzedHoldings.reduce((sum, item) => sum + item.buyAmount, 0);
    const totalStockCurrentAmount = analyzedHoldings.reduce((sum, item) => sum + item.currentAmount, 0);
    const totalNetProfit = analyzedHoldings.reduce((sum, item) => sum + item.netProfit, 0);
    const totalReturnRate = totalBuyAmount > 0 ? ((totalNetProfit / totalBuyAmount) * 100).toFixed(2) : "0.00";

    // 현금 합산
    const totalCash = (cashData.deposit || 0) + (cashData.cma || 0);
    const totalCurrentAmount = totalStockCurrentAmount + totalCash;

    return { totalBuyAmount, totalCurrentAmount, totalNetProfit, totalReturnRate, totalCash };
  }, [analyzedHoldings, cashData]);



  // --- Action Handlers ---
  const addHolding = async (holding: any) => {
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holding),
      });
      if (res.ok) {
        const newHolding = await res.json();
        setHoldings(prev => [...prev, newHolding]);
      }
    } catch (e) { console.error("Failed to add holding", e); }
  };

  const removeHolding = async (id: number) => {
    try {
      const res = await fetch(`/api/holdings?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHoldings(prev => prev.filter(h => h.id !== id));
      }
    } catch (e) { console.error("Failed to remove holding", e); }
  };

  const updateCash = async (newItem: CashData) => {
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const updated = await res.json();
        setCashData(updated);
      }
    } catch (e) { console.error("Failed to update cash", e); }
  };

  return { analyzedHoldings, stockSummaries, portfolioSummary, addHolding, removeHolding, cashData, updateCash, lastUpdate };
}