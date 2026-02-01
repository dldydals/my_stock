// components/dashboard/useStockData.ts

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { FEES } from "./constants";
import { AnalyzedHolding, StockSummary, PortfolioSummary, MarketData, Holding, CashData } from "./types";
import dayjs from 'dayjs'; 

export function useStockData() {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cashData, setCashData] = useState<CashData>({ 
    deposit: 0, 
    cma: 0, 
    totalDeposit: 0, 
    totalWithdrawal: 0 
  });
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const lastFetchDateRef = useRef<string>("");

  // 1. 보유 주식 목록 가져오기 (함수 분리)
  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch('/api/holdings');
      if (res.ok) {
        const rawData = await res.json();
        if (!rawData || rawData.length === 0) return;

        const normalizedData = rawData
          .filter((item: any) => {
             const name = (item.name || item.asset_name || "").toUpperCase();
             const ticker = (item.ticker || item.code || "").toUpperCase();
             const isCash = ["예수금", "CMA", "현금", "DEPOSIT", "KRW"].some(keyword => name.includes(keyword) || ticker.includes(keyword));
             return !isCash; 
          })
          .map((item: any, index: number) => {
             const foundTicker = item.ticker || item.code || item.symbol || item.asset_ticker || item.stock_code;
             const foundPrice = item.avgPrice || item.avg_price || item.buyPrice || item.buy_price || item.price || 0;

             return {
               ...item,
               code: foundTicker || `UNKNOWN-${index}`,
               ticker: foundTicker || `UNKNOWN-${index}`,
               name: item.name || item.asset_name || "이름없음",
               quantity: Number(item.quantity || 0),
               buyPrice: Number(foundPrice),
               avgPrice: Number(foundPrice),
               currentPrice: Number(item.currentPrice || item.current_price || item.price || 0),
             };
          });
        
        setHoldings(normalizedData);
      }
    } catch (e) { console.error("Failed to fetch holdings", e); }
  }, []);

  // 2. 현금 데이터 가져오기 (함수 분리)
  const fetchCash = useCallback(async () => {
    try {
      const res = await fetch('/api/cash');
      if (res.ok) {
        const data = await res.json();
        setCashData(data);
      }
    } catch (e) { console.error("Failed to fetch cash", e); }
  }, []);

  // 3. 시장 데이터(가격/전략) 가져오기 (함수 분리)
  const fetchAllDetails = useCallback(async (currentHoldings: Holding[]) => {
    if (currentHoldings.length === 0) return;

    const uniqueCodes = Array.from(new Set(
        currentHoldings
            .map((h) => h.code)
            .filter((code) => code && code !== "UNKNOWN")
    ));

    try {
        // (1) 전략 데이터 로드
        const strategyRes = await fetch('http://127.0.0.1:8000/strategy/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: uniqueCodes }),
        }).catch(() => null);
        
        const strategyData = strategyRes && strategyRes.ok ? await strategyRes.json() : {};

        // (2) 개별 주가 상세 로드
        const promises = uniqueCodes.map((code) => 
            fetch(`http://127.0.0.1:8000/stock/${code}`, { cache: 'no-store' })
                .then(res => res.ok ? res.json() : null)
                .catch(() => null)
        );
        
        const results = await Promise.all(promises);

        setMarketData((prev) => {
          const newData = { ...prev };
          results.forEach((data: any) => {
            if (data && data.ticker) {
                const strategy = strategyData[data.ticker] || null;
                newData[data.ticker] = { ...data, strategy };
            }
          });
          return newData;
        });
        lastFetchDateRef.current = new Date().toLocaleDateString();

    } catch (e) { console.error(e); }
  }, []);

  // ▼▼▼ [핵심] 외부에서 호출 가능한 통합 데이터 갱신 함수 ▼▼▼
  // 이 함수가 실행되면 모든 데이터를 새로 받고, 마지막에 시간을 찍습니다.
  const fetchData = async () => {
    console.log("🔄 데이터 동기화 중...");
    await fetchHoldings(); // 목록 갱신
    await fetchCash();     // 현금 갱신
    
    // holdings 상태가 업데이트 되기 전이라도, 기존 holdings가 있다면 가격 갱신 시도
    if (holdings.length > 0) {
        await fetchAllDetails(holdings);
    }

    // ★★★ 여기가 제일 중요! 데이터 수신 완료 시점에 시간 기록 ★★★
    setLastUpdate(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  };

  // 초기 로딩 (컴포넌트 마운트 시 실행)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // holdings가 변하면 시장 데이터 자동 갱신
  useEffect(() => {
    if (holdings.length > 0) {
        fetchAllDetails(holdings);
    }
  }, [holdings, fetchAllDetails]);

  // 주기적 갱신 (10초마다)
// ... 기존 코드들 ...

  // [수정 전] fetchAllDetails만 불러서 시간이 안 바뀌었음
  /*
  useEffect(() => {
    const interval = setInterval(() => {
        if (holdings.length > 0) fetchAllDetails(holdings);
    }, 10000);
    return () => clearInterval(interval);
  }, [holdings, fetchAllDetails]);
  */

  // ▼▼▼ [수정 후] fetchData를 불러서 시간(lastUpdate)까지 갱신! ▼▼▼
  useEffect(() => {
    // 1. 30초(30000ms) 마다 실행
    const interval = setInterval(() => {
        //console.log("⏰ 30초 자동 갱신 실행 중...");
        fetchData(); 
    }, 30000);

    // 2. 청소(Cleanup)
    return () => clearInterval(interval);
  }, [fetchData]); // fetchData가 바뀔 때만 재설정

  // ... 리턴 문 ...

  // --- 계산 로직 (기존 유지) ---
  const analyzedHoldings: AnalyzedHolding[] = useMemo(() => {
    return holdings.map((item) => {
      const marketInfo = marketData[item.code];
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
      if (item.strategy) stock.strategy = item.strategy;
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
    let stockSum = 0;
    analyzedHoldings.forEach((item) => {
        stockSum += item.currentAmount;
    });

    const cashSum = (cashData.deposit || 0) + (cashData.cma || 0);
    const totalBuyAmount = analyzedHoldings.reduce((sum, item) => sum + item.buyAmount, 0);
    const totalNetProfit = analyzedHoldings.reduce((sum, item) => sum + item.netProfit, 0);
    const totalReturnRate = totalBuyAmount > 0 ? ((totalNetProfit / totalBuyAmount) * 100).toFixed(2) : "0.00";
    
    return { 
        totalBuyAmount, 
        totalCurrentAmount: stockSum, 
        totalNetProfit, 
        totalReturnRate, 
        totalCash: cashSum 
    };
  }, [analyzedHoldings, cashData]);

  // Action Handlers
  const addHolding = async (holding: any) => {}; 
  const removeHolding = async (id: number) => {}; 
  const updateCash = async (newItem: CashData) => {
    try {
        await fetch("/api/cash", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newItem),
        });
        setCashData(newItem);
    } catch(e) {}
  };

  // ▼▼▼ [핵심] fetchData를 리턴 객체에 포함시켜 외부에서 쓸 수 있게 합니다 ▼▼▼
  return { 
    analyzedHoldings, 
    stockSummaries, 
    portfolioSummary, 
    addHolding, 
    removeHolding, 
    cashData, 
    updateCash, 
    lastUpdate, 
    fetchData // 👈 이제 page.tsx에서 이 함수를 부르면 시간도 갱신됩니다!
  };
}