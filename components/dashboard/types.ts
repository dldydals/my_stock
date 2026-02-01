// types.ts

export interface Holding {
  id: number;
  name: string;
  code: string;
  ticker?: string; // DB에서 넘어오는 이름 (옵션 처리)
  date: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

export interface StrategyData {
  price: number; // 백엔드 분석 시점의 가격
  rsi: number;
  foreigner: number;
  institution: number;
  individual: number;
  is_gap_up: boolean;
  is_opening_defended: boolean;
  data_source?: string; // 예: "LIVE_EST(10:30)" 또는 "DAILY_CLOSE"
  alerts: {
    code: string;
    level: "info" | "success" | "warning";
    message: string;
  }[];
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
  strategy?: StrategyData;
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

export interface CashData {
  deposit: number;
  cma: number;
  // ▼▼▼ 아래 두 줄을 추가해 주세요 ▼▼▼
  totalDeposit?: number;    // 누적 입금액
  totalWithdrawal?: number; // 누적 출금액
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
  strategy?: StrategyData;
}