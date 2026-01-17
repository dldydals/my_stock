"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  BarChart2,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ----------------------------------------------------------------------
// 1. 초기 데이터 설정 (사용자 데이터)
// ----------------------------------------------------------------------
const INITIAL_HOLDINGS = [
  // SK스퀘어
  {
    id: 1,
    name: "SK스퀘어",
    code: "402340",
    date: "2025-02-20",
    quantity: 100,
    buyPrice: 101100,
    currentPrice: 321000,
  },
  {
    id: 2,
    name: "SK스퀘어",
    code: "402340",
    date: "2025-03-27",
    quantity: 100,
    buyPrice: 96600,
    currentPrice: 321000,
  },
  {
    id: 3,
    name: "SK스퀘어",
    code: "402340",
    date: "2025-03-31",
    quantity: 107,
    buyPrice: 92000,
    currentPrice: 321000,
  },
  {
    id: 4,
    name: "SK스퀘어",
    code: "402340",
    date: "2025-04-22",
    quantity: 28,
    buyPrice: 82200,
    currentPrice: 321000,
  },
  {
    id: 5,
    name: "SK스퀘어",
    code: "402340",
    date: "2025-09-24",
    quantity: 119,
    buyPrice: 213000,
    currentPrice: 321000,
  },

  // 현대차우
  {
    id: 6,
    name: "현대차우",
    code: "005385",
    date: "2025-02-03",
    quantity: 54,
    buyPrice: 159000,
    currentPrice: 203500,
  },
  {
    id: 7,
    name: "현대차우",
    code: "005385",
    date: "2025-02-03",
    quantity: 47,
    buyPrice: 157200,
    currentPrice: 203500,
  },
  {
    id: 8,
    name: "현대차우",
    code: "005385",
    date: "2025-02-17",
    quantity: 100,
    buyPrice: 156000,
    currentPrice: 203500,
  },
  {
    id: 9,
    name: "현대차우",
    code: "005385",
    date: "2025-02-25",
    quantity: 98,
    buyPrice: 159000,
    currentPrice: 203500,
  },
  {
    id: 10,
    name: "현대차우",
    code: "005385",
    date: "2025-11-06",
    quantity: 50,
    buyPrice: 197500,
    currentPrice: 203500,
  },
  {
    id: 11,
    name: "현대차우",
    code: "005385",
    date: "2025-11-28",
    quantity: 100,
    buyPrice: 193500,
    currentPrice: 203500,
  },

  // KB금융
  {
    id: 12,
    name: "KB금융",
    code: "105560",
    date: "2025-11-14",
    quantity: 100,
    buyPrice: 129500,
    currentPrice: 126100,
  },

  // 현대모비스 (2021년 매수분)
  {
    id: 13,
    name: "현대모비스",
    code: "012330",
    date: "2021-07-22",
    quantity: 68,
    buyPrice: 280000,
    currentPrice: 365000,
  },
  {
    id: 14,
    name: "현대모비스",
    code: "012330",
    date: "2021-07-28",
    quantity: 32,
    buyPrice: 271500,
    currentPrice: 365000,
  },

  // LG디스플레이
  {
    id: 15,
    name: "LG디스플레이",
    code: "034220",
    date: "2021-06-11",
    quantity: 283,
    buyPrice: 23000,
    currentPrice: 11850,
  },
  {
    id: 16,
    name: "LG디스플레이",
    code: "034220",
    date: "2021-10-29",
    quantity: 180,
    buyPrice: 18400,
    currentPrice: 11850,
  },
  {
    id: 17,
    name: "LG디스플레이",
    code: "034220",
    date: "2021-11-15",
    quantity: 55,
    buyPrice: 20200,
    currentPrice: 11850,
  },
  {
    id: 18,
    name: "LG디스플레이",
    code: "034220",
    date: "2022-02-03",
    quantity: 209,
    buyPrice: 19400,
    currentPrice: 11850,
  },
  {
    id: 19,
    name: "LG디스플레이",
    code: "034220",
    date: "2022-02-07",
    quantity: 465,
    buyPrice: 19350,
    currentPrice: 11850,
  },
];

const FEES = {
  BUY_FEE_RATE: 0.00015,
  SELL_FEE_RATE: 0.00015,
  TAX_RATE: 0.0018,
};

const COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6"];

// ----------------------------------------------------------------------
// 2. 유틸리티 및 시뮬레이션 함수 (Backend 로직 대체)
// ----------------------------------------------------------------------

// 날짜 포맷터
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

/**
 * [가상 데이터 생성 엔진]
 * 실제로는 pykrx를 통해 일별 종가를 받아와야 하지만,
 * 여기서는 매수 시점과 현재 가격을 기준으로 선형 보간 + 랜덤 노이즈를 섞어
 * 과거 주가 흐름을 시뮬레이션하여 차트를 그립니다.
 */
const generateHistoricalData = (holdings) => {
  // 1. 전체 기간 설정 (가장 이른 매수일 ~ 현재)
  const dates = holdings.map((h) => new Date(h.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = new Date("2025-12-30").getTime(); // 현재 시점 가정

  const dailyData = [];
  const oneDay = 24 * 60 * 60 * 1000;

  // 종목별 가격 흐름 생성 (매수가 -> 현재가로 수렴하도록)
  const uniqueCodes = [...new Set(holdings.map((h) => h.code))];
  const priceHistory = {};

  uniqueCodes.forEach((code) => {
    const stockItems = holdings.filter((h) => h.code === code);
    const firstBuy = stockItems.reduce((prev, curr) =>
      prev.date < curr.date ? prev : curr
    );
    const startPrice = firstBuy.buyPrice;
    const endPrice = firstBuy.currentPrice;

    priceHistory[code] = {};

    let currentDate = minDate;
    while (currentDate <= maxDate) {
      const progress = (currentDate - minDate) / (maxDate - minDate);
      // 선형 보간 + 랜덤 워크 (변동성 부여)
      const volatility = startPrice * 0.05 * (Math.random() - 0.5);
      const interpolatedPrice = startPrice + (endPrice - startPrice) * progress;

      const dateKey = new Date(currentDate).toISOString().split("T")[0];
      priceHistory[code][dateKey] = Math.floor(interpolatedPrice + volatility);

      currentDate += oneDay;
    }
  });

  // 2. 일별 자산 가치 계산
  let currentDate = minDate;
  while (currentDate <= maxDate) {
    const dateStr = new Date(currentDate).toISOString().split("T")[0];
    let totalInvested = 0;
    let totalEvaluation = 0;

    holdings.forEach((item) => {
      const itemBuyDate = new Date(item.date).getTime();
      // 해당 날짜에 이미 매수한 종목인지 확인
      if (itemBuyDate <= currentDate) {
        totalInvested += item.buyPrice * item.quantity;
        // 시뮬레이션 된 해당 날짜의 주가 적용 (없으면 매수가로 대체)
        const dailyPrice = priceHistory[item.code]?.[dateStr] || item.buyPrice;
        totalEvaluation += dailyPrice * item.quantity;
      }
    });

    if (totalInvested > 0) {
      dailyData.push({
        date: dateStr,
        displayDate: formatDate(dateStr),
        invested: totalInvested,
        valuation: totalEvaluation,
        profit: totalEvaluation - totalInvested,
        rate: ((totalEvaluation - totalInvested) / totalInvested) * 100,
      });
    }

    currentDate += oneDay;
  }

  // 데이터 포인트가 너무 많으면 차트 렌더링이 느리므로 1/10로 샘플링 (최근 데이터는 유지)
  return dailyData.filter(
    (_, index) => index % 7 === 0 || index === dailyData.length - 1
  );
};

// ----------------------------------------------------------------------
// 3. UI 컴포넌트
// ----------------------------------------------------------------------

const StockSummaryCard = ({ stock }) => {
  const isProfit = stock.netProfit >= 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-indigo-200 transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2 rounded-lg">
            <span className="font-bold text-slate-700">{stock.name[0]}</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">
              {stock.name}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {stock.code}
            </span>
          </div>
        </div>
        <div
          className={`text-right ${
            isProfit ? "text-red-600" : "text-blue-600"
          }`}
        >
          <div className="text-sm font-bold">
            {isProfit ? "+" : ""}
            {stock.returnRate}%
          </div>
          <div
            className={`text-xs font-medium px-1.5 py-0.5 rounded inline-block mt-1 ${
              isProfit ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            {isProfit ? "수익" : "손실"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-slate-400 text-xs mb-1">보유수량</p>
          <p className="font-semibold text-slate-700">
            {stock.quantity.toLocaleString()}주
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs mb-1">평균단가</p>
          <p className="font-semibold text-slate-700">
            {stock.avgBuyPrice.toLocaleString()}원
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-1">평가금액</p>
          <p className="font-bold text-slate-900">
            {stock.currentAmount.toLocaleString()}원
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs mb-1">현재가</p>
          <p
            className={`font-semibold ${
              isProfit ? "text-red-500" : "text-blue-500"
            }`}
          >
            {stock.currentPrice.toLocaleString()}원
          </p>
        </div>
      </div>

      <div
        className={`pt-3 border-t border-slate-100 flex justify-between items-center ${
          isProfit
            ? "bg-red-50/30 -mx-5 -mb-5 px-5 pb-5 mt-2 pt-4"
            : "bg-blue-50/30 -mx-5 -mb-5 px-5 pb-5 mt-2 pt-4"
        }`}
      >
        <span className="text-sm font-medium text-slate-600">평가손익</span>
        <span
          className={`text-lg font-bold ${
            isProfit ? "text-red-600" : "text-blue-600"
          }`}
        >
          {isProfit ? "+" : ""}
          {stock.netProfit.toLocaleString()}원
        </span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. 메인 앱
// ----------------------------------------------------------------------

export default function App() {
  const [prices, setPrices] = useState({});
  const [holdings] = useState(INITIAL_HOLDINGS);
  const [chartPeriod, setChartPeriod] = useState("ALL"); // 'ALL' or '1Y'

  // 차트용 시뮬레이션 데이터 생성
  const historicalData = useMemo(
    () => generateHistoricalData(holdings),
    [holdings]
  );

  // 데이터 필터링 (기간별)
  const filteredChartData = useMemo(() => {
    if (chartPeriod === "1Y") {
      const oneYearAgo = new Date("2024-12-30").getTime();
      return historicalData.filter(
        (d) => new Date(d.date).getTime() >= oneYearAgo
      );
    }
    return historicalData;
  }, [historicalData, chartPeriod]);

  // 실시간 가격 데이터 가져오기 (여기서는 API 호출 시늉만 함)
  useEffect(() => {
    // 실제 구현시: const fetchPrices = async () => { ... pykrx API 호출 ... }
    // 여기서는 INITIAL_HOLDINGS의 currentPrice를 그대로 사용한다고 가정
    const initialPrices = {};
    INITIAL_HOLDINGS.forEach((h) => {
      initialPrices[h.code] = h.currentPrice;
    });
    setPrices(initialPrices);
  }, []);

  // [데이터 계산 로직] - 기존 로직 유지
  const analyzedHoldings = useMemo(() => {
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

  // 종목별 합계
  const stockSummaries = useMemo(() => {
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

    return Array.from(summaryMap.values()).map((stock) => {
      const avgBuyPrice = Math.floor(stock.buyAmount / stock.quantity);
      const grossProfit = stock.currentAmount - stock.buyAmount;
      const netProfit = grossProfit - stock.totalFees;
      const returnRate = ((netProfit / stock.buyAmount) * 100).toFixed(2);
      return { ...stock, avgBuyPrice, netProfit, returnRate };
    });
  }, [analyzedHoldings]);

  // 전체 포트폴리오 요약
  const portfolioSummary = useMemo(() => {
    const totalBuyAmount = analyzedHoldings.reduce(
      (sum, item) => sum + item.buyAmount,
      0
    );
    const totalCurrentAmount = analyzedHoldings.reduce(
      (sum, item) => sum + item.currentAmount,
      0
    );
    const totalNetProfit = analyzedHoldings.reduce(
      (sum, item) => sum + item.netProfit,
      0
    );
    const totalReturnRate = ((totalNetProfit / totalBuyAmount) * 100).toFixed(
      2
    );
    return {
      totalBuyAmount,
      totalCurrentAmount,
      totalNetProfit,
      totalReturnRate,
    };
  }, [analyzedHoldings]);

  const isTotalProfit = portfolioSummary.totalNetProfit >= 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              ASSET DASHBOARD
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs px-3 py-1 bg-slate-100 rounded-full font-medium text-slate-600 hidden sm:inline-block">
              2025.12.30 마감 기준
            </span>
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 총 평가 자산 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> 총 평가 자산
              </p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">
                {portfolioSummary.totalCurrentAmount.toLocaleString()}{" "}
                <span className="text-lg font-normal text-slate-400">원</span>
              </p>
              <p className="text-sm text-slate-400 mt-2">
                투자 원금: {portfolioSummary.totalBuyAmount.toLocaleString()}원
              </p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-32 h-32 -mr-4 -mb-4" />
            </div>
          </div>

          {/* 총 손익 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 총 평가 손익
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-3xl font-bold tracking-tight ${
                  isTotalProfit ? "text-red-600" : "text-blue-600"
                }`}
              >
                {isTotalProfit ? "+" : ""}
                {portfolioSummary.totalNetProfit.toLocaleString()}
              </p>
              <span className="text-slate-400 font-medium">원</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              수수료 및 제세금 포함 예상치
            </p>
          </div>

          {/* 수익률 */}
          <div
            className={`p-6 rounded-2xl shadow-sm border ${
              isTotalProfit
                ? "bg-gradient-to-br from-red-50 to-white border-red-100"
                : "bg-gradient-to-br from-blue-50 to-white border-blue-100"
            }`}
          >
            <p
              className={`text-sm font-medium mb-2 flex items-center gap-2 ${
                isTotalProfit ? "text-red-700" : "text-blue-700"
              }`}
            >
              <PieChartIcon className="w-4 h-4" /> 총 수익률
            </p>
            <div className="flex items-center gap-2">
              {isTotalProfit ? (
                <ArrowUpRight className="w-8 h-8 text-red-600" />
              ) : (
                <ArrowDownRight className="w-8 h-8 text-blue-600" />
              )}
              <p
                className={`text-4xl font-extrabold tracking-tight ${
                  isTotalProfit ? "text-red-600" : "text-blue-600"
                }`}
              >
                {isTotalProfit ? "+" : ""}
                {portfolioSummary.totalReturnRate}%
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <PieChartIcon className="w-5 h-5 text-indigo-500" />
              포트폴리오 비중
            </h2>
            <div className="flex-1 min-h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockSummaries}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="currentAmount"
                  >
                    {stockSummaries.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${value.toLocaleString()}원`}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value, entry) => (
                      <span className="text-xs font-medium text-slate-600 ml-1">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-lg font-bold text-slate-800">100%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Visualizations (New Section) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart: Asset Trend */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                자산 추이 (Time Series)
              </h2>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {["ALL", "1Y"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      chartPeriod === period
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {period === "ALL" ? "전체" : "1년"}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredChartData}>
                  <defs>
                    <linearGradient
                      id="colorValuation"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorInvested"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      `${(value / 1000000).toFixed(0)}M`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    itemStyle={{ fontSize: "13px", fontWeight: 600 }}
                    labelStyle={{
                      color: "#64748b",
                      marginBottom: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [`${value.toLocaleString()}원`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valuation"
                    name="평가금액"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValuation)"
                  />
                  <Area
                    type="stepAfter"
                    dataKey="invested"
                    name="투자원금"
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorInvested)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub Chart: Portfolio Weight */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
              <PieChartIcon className="w-5 h-5 text-indigo-500" />
              포트폴리오 비중
            </h2>
            <div className="flex-1 min-h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockSummaries}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="currentAmount"
                  >
                    {stockSummaries.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${value.toLocaleString()}원`}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value, entry) => (
                      <span className="text-xs font-medium text-slate-600 ml-1">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-lg font-bold text-slate-800">100%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Stock List Tables */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-indigo-500" />
            보유 종목 현황
          </h2>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-indigo-50/50 text-slate-500 font-medium border-b border-indigo-100">
                <tr>
                  <th className="px-6 py-4">종목명</th>
                  <th className="px-6 py-4 text-right">보유수량</th>
                  <th className="px-6 py-4 text-right">평균단가</th>
                  <th className="px-6 py-4 text-right">총매수액</th>
                  <th className="px-6 py-4 text-right">현재가</th>
                  <th className="px-6 py-4 text-right">평가금액</th>
                  <th className="px-6 py-4 text-right">평가손익</th>
                  <th className="px-6 py-4 text-right">수익률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockSummaries.map((stock) => {
                  const isProfit = stock.netProfit >= 0;
                  return (
                    <tr
                      key={stock.code}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-base">
                          {stock.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {stock.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {stock.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {stock.avgBuyPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {stock.buyAmount.toLocaleString()}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-medium ${
                          isProfit ? "text-red-500" : "text-blue-500"
                        }`}
                      >
                        {stock.currentPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                        {stock.currentAmount.toLocaleString()}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${
                          isProfit ? "text-red-600" : "text-blue-600"
                        }`}
                      >
                        {isProfit ? "+" : ""}
                        {stock.netProfit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isProfit
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {isProfit ? "+" : ""}
                          {stock.returnRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {stockSummaries.map((stock) => (
              <StockSummaryCard key={stock.code} stock={stock} />
            ))}
          </div>
        </div>

        {/* 4. Detailed History */}
        <div>
          <div className="px-1 py-4 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-500" />
              상세 거래 이력
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">
              *수수료 및 제세금 자동 계산 적용
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">종목명/일자</th>
                    <th className="px-6 py-4 text-right">수량</th>
                    <th className="px-6 py-4 text-right">매수단가</th>
                    <th className="px-6 py-4 text-right hidden sm:table-cell">
                      매수금액
                    </th>
                    <th className="px-6 py-4 text-right">현재가</th>
                    <th className="px-6 py-4 text-right">수익률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyzedHoldings.map((item) => {
                    const isItemProfit = item.netProfit >= 0;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.date}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-700">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          {item.buyPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600 hidden sm:table-cell">
                          {item.buyAmount.toLocaleString()}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-medium ${
                            isItemProfit ? "text-red-500" : "text-blue-500"
                          }`}
                        >
                          {item.currentPrice.toLocaleString()}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-bold ${
                            isItemProfit ? "text-red-600" : "text-blue-600"
                          }`}
                        >
                          {isItemProfit ? "+" : ""}
                          {item.returnRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
