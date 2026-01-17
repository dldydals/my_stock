// types.ts
export interface Holding {
  id: number;
  name: string;
  code: string;
  date: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

export interface AnalyzedHolding extends Holding {
  buyAmount: number;
  currentAmount: number;
  totalFees: number;
  grossProfit: number;
  netProfit: number;
  returnRate: string;
  change_rate?: number;
  per?: number;
  pbr?: number;
  dividend_yield?: number;
}

export interface StockSummary {
  name: string;
  code: string;
  quantity: number;
  buyAmount: number;
  currentAmount: number;
  totalFees: number;
  currentPrice: number;
  avgBuyPrice: number;
  netProfit: number;
  returnRate: string;
  change_rate?: number;
  strategy?: StrategyData;
}

export interface StrategyData {
  rsi: number;
  foreigner: number;
  institution: number;
  individual: number;
  is_gap_up: boolean;
  is_opening_defended: boolean;
  alerts: {
    code: string;
    level: "info" | "success" | "warning";
    message: string;
  }[];
}

export interface CashData {
  deposit: number;
  cma: number;
}

export interface PortfolioSummary {
  totalBuyAmount: number;
  totalCurrentAmount: number;
  totalNetProfit: number;
  totalReturnRate: string;
  totalCash: number;
}

export interface MarketData {
  ticker: string;
  date: string;
  price: number;
  change_rate: number;
  per: number;
  pbr: number;
  dividend_yield: number;
  market_cap: number;
  volume: number;
}