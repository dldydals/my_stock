import { useState, useEffect, useMemo } from "react";
import { INITIAL_HOLDINGS, FEES } from "./constants";
import { AnalyzedHolding, StockSummary, PortfolioSummary } from "./types";

export function useStockData() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [holdings] = useState(INITIAL_HOLDINGS);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const uniqueCodes = Array.from(new Set(INITIAL_HOLDINGS.map((h) => h.code)));
        const pricePromises = uniqueCodes.map((code) =>
          fetch(`/api/stock?ticker=${code}`)
            .then((res) => res.json())
            .then((data) => ({ code, price: data.currentPrice }))
            .catch(() => null)
        );
        const results = await Promise.all(pricePromises);
        const newPrices: Record<string, number> = {};
        results.forEach((result) => {
          if (result) newPrices[result.code] = result.price;
        });
        setPrices((prev) => ({ ...prev, ...newPrices }));
      } catch (error) {
        console.error("Error fetching prices", error);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const analyzedHoldings: AnalyzedHolding[] = useMemo(() => {
    return holdings.map((item) => {
      const realTimePrice = prices[item.code] || item.currentPrice;
      const buyAmount = item.buyPrice * item.quantity;
      const currentAmount = realTimePrice * item.quantity;
      const buyFee = buyAmount * FEES.BUY_FEE_RATE;
      const sellFee = currentAmount * FEES.SELL_FEE_RATE;
      const tax = currentAmount * FEES.TAX_RATE;
      const totalFees = Math.floor(buyFee + sellFee + tax);
      const grossProfit = currentAmount - buyAmount;
      const netProfit = grossProfit - totalFees;
      const returnRate = ((netProfit / buyAmount) * 100).toFixed(2);

      return {
        ...item,
        currentPrice: realTimePrice,
        buyAmount,
        currentAmount,
        totalFees,
        grossProfit,
        netProfit,
        returnRate,
      };
    });
  }, [holdings, prices]);

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
        });
      }
      const stock = summaryMap.get(item.code);
      stock.quantity += item.quantity;
      stock.buyAmount += item.buyAmount;
      stock.currentAmount += item.currentAmount;
      stock.totalFees += item.totalFees;
    });

    return Array.from(summaryMap.values()).map((stock: any) => {
      const avgBuyPrice = Math.floor(stock.buyAmount / stock.quantity);
      const grossProfit = stock.currentAmount - stock.buyAmount;
      const netProfit = grossProfit - stock.totalFees;
      const returnRate = ((netProfit / stock.buyAmount) * 100).toFixed(2);
      return { ...stock, avgBuyPrice, netProfit, returnRate };
    });
  }, [analyzedHoldings]);

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    const totalBuyAmount = analyzedHoldings.reduce((sum, item) => sum + item.buyAmount, 0);
    const totalCurrentAmount = analyzedHoldings.reduce((sum, item) => sum + item.currentAmount, 0);
    const totalNetProfit = analyzedHoldings.reduce((sum, item) => sum + item.netProfit, 0);
    const totalReturnRate = ((totalNetProfit / totalBuyAmount) * 100).toFixed(2);
    return { totalBuyAmount, totalCurrentAmount, totalNetProfit, totalReturnRate };
  }, [analyzedHoldings]);

  return { analyzedHoldings, stockSummaries, portfolioSummary };
}