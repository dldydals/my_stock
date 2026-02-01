// components/dashboard/useStockData.ts

import { useState, useEffect, useMemo, useRef } from "react";
import { FEES } from "./constants";
import { AnalyzedHolding, StockSummary, PortfolioSummary, MarketData, Holding, CashData } from "./types";

export function useStockData() {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cashData, setCashData] = useState<CashData>({ 
    deposit: 0, 
    cma: 0, 
      totalDeposit: 0, 
      totalWithdrawal: 0 });
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const lastFetchDateRef = useRef<string>("");

  // 1. 보유 주식 데이터 로드 (핵심 수정 적용됨)
// 1. 보유 주식 데이터 로드
  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const res = await fetch('/api/holdings');
        if (res.ok) {
          const rawData = await res.json();
          if (!rawData || rawData.length === 0) return;

          const normalizedData = rawData
            // ▼▼▼ [핵심] 현금성 자산은 주식 리스트에서 제외합니다! ▼▼▼
            .filter((item: any) => {
               // DB 컬럼명에 따라 item.name, item.asset_name 등 다를 수 있으니 안전하게 확인
               const name = (item.name || item.asset_name || "").toUpperCase();
               const ticker = (item.ticker || item.code || "").toUpperCase();
               
               // "예수금", "CMA", "현금", "KRW" 등이 포함된 항목은 제외 (false 반환)
               const isCash = ["예수금", "CMA", "현금", "DEPOSIT", "KRW"].some(keyword => name.includes(keyword) || ticker.includes(keyword));
               return !isCash; 
            })
            .map((item: any, index: number) => {
                // ... (기존 매핑 로직 유지) ...
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
    };
    // ...
    
    // ... (fetchCash 등 나머지 코드는 건드리지 마세요) ...
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

  // 2. 시장 데이터 로드
  useEffect(() => {
    if (holdings.length === 0) return;

    // ▼▼▼ 유효한 코드만 추출 (undefined 제거) ▼▼▼
    const uniqueCodes = Array.from(new Set(
        holdings
            .map((h) => h.code)
            .filter((code) => code && code !== "UNKNOWN")
    ));

    // 2-1. 상세 정보 + 전략 정보 로드
    const fetchAllDetails = async () => {
      try {
        // (1) 전략 데이터 로드 (Batch)
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
                // 전략 데이터가 있으면 합쳐줍니다.
                const strategy = strategyData[data.ticker] || null;
                newData[data.ticker] = { ...data, strategy };
            }
          });
          return newData;
        });
        lastFetchDateRef.current = new Date().toLocaleDateString();
      } catch (e) { console.error(e); }
    };

    // 2-2. 현재가 업데이트
    const fetchPricesOnly = async () => {
      try {
        const promises = uniqueCodes.map((code) => 
            fetch(`http://127.0.0.1:8000/price/${code}`)
                .then(res => res.ok ? res.json() : null)
                .catch(() => null)
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
        // 10초마다 갱신 (단순화)
        fetchAllDetails();
    }, 10000);

    return () => clearInterval(interval);
  }, [holdings]);


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
        strategy: marketInfo?.strategy // 여기서 전략 연결
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
      stock.currentPrice = item.currentPrice; // 최신 가격 덮어쓰기
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

  // ... (analyzedHoldings 로직 유지) ...

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    // 1. 순수 주식 평가금액 합계 (현금 제외)
    let stockSum = 0;
    analyzedHoldings.forEach((item) => {
        stockSum += item.currentAmount;
    });

    // 2. 현금 합계
    const cashSum = (cashData.deposit || 0) + (cashData.cma || 0);

    // 3. 리턴값 구성
    const totalBuyAmount = analyzedHoldings.reduce((sum, item) => sum + item.buyAmount, 0);
    
    // 순수 주식 손익 (주식평가금 - 주식매수금 - 수수료)
    const totalNetProfit = analyzedHoldings.reduce((sum, item) => sum + item.netProfit, 0);
    
    // 수익률 계산
    const totalReturnRate = totalBuyAmount > 0 ? ((totalNetProfit / totalBuyAmount) * 100).toFixed(2) : "0.00";
    
    return { 
        totalBuyAmount, 
        
        // ▼▼▼ [수정됨] 여기에 현금을 더하지 않고 '순수 주식 총액'만 보냅니다. ▼▼▼
        // (화면 컴포넌트인 SummaryStats가 알아서 현금을 더해서 보여줄 겁니다)
        totalCurrentAmount: stockSum, 
        
        totalNetProfit, 
        totalReturnRate, 
        totalCash: cashSum 
    };
  }, [analyzedHoldings, cashData]);


  // Action Handlers
  const addHolding = async (holding: any) => {}; // 필요시 구현
  const removeHolding = async (id: number) => {}; // 필요시 구현
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

  return { analyzedHoldings, stockSummaries, portfolioSummary, addHolding, removeHolding, cashData, updateCash, lastUpdate };
}