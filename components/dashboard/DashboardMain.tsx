"use client";
import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Coins,
} from "lucide-react";
import { useStockData } from "./useStockData";
import { StockSummaryCard } from "./StockSummaryCard";
import { PortfolioChart } from "./PortfolioChart";
import { TransactionDetailModal } from "./TransactionDetailModal";
import { AddTransactionModal } from "./AddTransactionModal";
import { CashManagementModal } from "./CashManagementModal";
import { AnalyzedHolding } from "./types";

export default function DashboardMain() {
  const { analyzedHoldings, stockSummaries, portfolioSummary, addHolding, removeHolding, cashData, updateCash } = useStockData();
  const isTotalProfit = portfolioSummary.totalNetProfit >= 0;

  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);

  // Derived state for real-time updates
  const selectedTransaction = analyzedHoldings.find(h => h.id === selectedTransactionId) || null;

  const handleRowClick = (holding: AnalyzedHolding) => {
    setSelectedTransactionId(holding.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransactionId(null);
  };

  const handleAddTransaction = (data: any) => {
    addHolding(data);
    setIsAddModalOpen(false);
  }

  return (
    <div className="min-h-screen bg-green-50/75 font-sans text-slate-800 pb-20 selection:bg-indigo-100 selection:text-indigo-900">
      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl shadow-md shadow-indigo-200">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              My Portfolio <span className="text-indigo-500">.</span>
            </h1>
          </div>
          <div
            className="flex items-center gap-2 text-sm text-slate-500 bg-gray-100 px-3 py-1 rounded-full font-medium"
            suppressHydrationWarning={true}
          >
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">


        {/* --- Top Cards & Chart --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 총 자산 */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
              <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="w-32 h-32" />
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <p className="text-base font-bold text-gray-500 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50"></span>
                    총 평가 자산
                  </p>
                  <button
                    onClick={() => setIsCashModalOpen(true)}
                    className="text-xs flex items-center gap-1.5 text-indigo-600 font-bold bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-all hover:scale-105 active:scale-95"
                  >
                    <Coins className="w-4 h-4" />
                    현금 관리
                  </button>
                </div>

                <div className="flex items-baseline gap-1.5 mb-2">
                  <p className="text-5xl font-extrabold text-slate-900 tracking-tight">
                    {portfolioSummary.totalCurrentAmount.toLocaleString()}
                  </p>
                  <span className="text-2xl font-bold text-slate-400">원</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm text-gray-500 pt-6 border-t border-gray-50 mt-auto">
                <div className="flex items-center justify-between w-full">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-gray-600">
                    투자원금
                  </span>
                  <span className="font-semibold text-gray-700">
                    {portfolioSummary.totalBuyAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-500">보유현금</span>
                  <span className="font-bold text-indigo-900">
                    {portfolioSummary.totalCash.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 예상 손익 */}
            <div className="bg-white p-7 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
              <p className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${isTotalProfit ? "bg-red-500" : "bg-blue-500"
                    }`}
                ></span>
                총 예상 손익
              </p>
              <div className="flex items-center gap-3 mt-1">
                <p
                  className={`text-4xl font-extrabold tracking-tight ${isTotalProfit ? "text-red-600" : "text-blue-600"
                    }`}
                >
                  {isTotalProfit ? "+" : ""}
                  {portfolioSummary.totalNetProfit.toLocaleString()}
                </p>
                <div
                  className={`flex items-center px-2 py-1 rounded-lg text-sm font-bold ${isTotalProfit
                    ? "bg-red-50 text-red-600"
                    : "bg-blue-50 text-blue-600"
                    }`}
                >
                  {isTotalProfit ? (
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                  )}
                  {portfolioSummary.totalReturnRate}%
                </div>
              </div>
              <p className="mt-6 text-sm text-gray-400">
                수수료 및 제세금 포함 (예상치)
              </p>
            </div>
          </div>

          <PortfolioChart stockSummaries={stockSummaries} />
        </div>

        {/* --- Stock Summaries List --- */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-500" /> 보유 종목 현황
            </h2>
          </div>

          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">종목 정보</th>
                  <th className="px-6 py-3 text-right">보유수량</th>
                  <th className="px-6 py-3 text-right">평균단가</th>
                  <th className="px-6 py-3 text-right">매수금액</th>
                  <th className="px-6 py-3 text-right">현재가</th>
                  <th className="px-6 py-3 text-right">전일대비</th>
                  <th className="px-6 py-3 text-right">평가금액</th>
                  <th className="px-6 py-3 text-right">평가손익</th>
                  <th className="px-6 py-3 text-right">수익률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stockSummaries.map((stock) => {
                  const isProfit = stock.netProfit >= 0;

                  // [수정] 등락률 로직 추가
                  const changeRate = stock.change_rate || 0;
                  const isRise = changeRate > 0;
                  const isFall = changeRate < 0;
                  const rateColor = isRise
                    ? "text-red-500"
                    : isFall
                      ? "text-blue-500"
                      : "text-gray-500";
                  const bgRateColor = isRise
                    ? "bg-red-50"
                    : isFall
                      ? "bg-blue-50"
                      : "bg-gray-50";

                  let changeAmount = 0;
                  if (changeRate !== 0 && stock.currentPrice) {
                    const prevPrice =
                      stock.currentPrice / (1 + changeRate / 100);
                    changeAmount = Math.round(stock.currentPrice - prevPrice);
                  }

                  return (
                    <tr
                      key={stock.code}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-default"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                            {stock.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-gray-800 text-base">
                                {stock.name}
                              </div>
                              {/* 전략 알림 뱃지 */}
                              {stock.strategy?.alerts && stock.strategy.alerts.length > 0 && (
                                <div className="flex gap-1">
                                  {stock.strategy.alerts.map((alert, idx) => (
                                    <span key={idx} className={`w-2 h-2 rounded-full ${alert.level === 'warning' ? 'bg-orange-500' :
                                      alert.level === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                      }`} title={alert.message}></span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                <span>{stock.code}</span>
                                {stock.strategy && (
                                  <>
                                    <span className="text-gray-300">|</span>
                                    <span className={`${stock.strategy.rsi <= 30 ? 'text-red-500 font-bold' : ''}`}>
                                      RSI {stock.strategy.rsi}
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span title="시초가 사수 여부">
                                      {stock.strategy.is_opening_defended ? (
                                        <span className="text-red-500 font-semibold">시초가↑</span>
                                      ) : (
                                        <span className="text-blue-500 font-semibold">시초가↓</span>
                                      )}
                                    </span>
                                  </>
                                )}
                              </div>
                              {stock.strategy && (
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                  <span title="외국인 순매수" className={stock.strategy.foreigner > 0 ? 'text-red-500' : 'text-blue-500'}>
                                    외 {stock.strategy.foreigner > 0 ? '+' : ''}{Math.round(stock.strategy.foreigner / 1000000)}M
                                  </span>
                                  <span title="기관 순매수" className={stock.strategy.institution > 0 ? 'text-red-500' : 'text-blue-500'}>
                                    기 {stock.strategy.institution > 0 ? '+' : ''}{Math.round(stock.strategy.institution / 1000000)}M
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-600">
                        {stock.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        {stock.avgBuyPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        {stock.buyAmount.toLocaleString()}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-bold ${isProfit ? "text-red-500" : "text-blue-500"
                          }`}
                      >
                        {(stock.currentPrice || 0).toLocaleString()}
                      </td>

                      {/* [수정] 등락률 표시 셀 추가 */}
                      <td className="px-6 py-3 text-right">
                        <div
                          className={`inline-flex items-center justify-end font-bold ${rateColor}`}
                        >
                          {/* 1. 화살표 아이콘 */}
                          {isRise && <TrendingUp className="w-3 h-3 mr-1" />}
                          {isFall && <TrendingDown className="w-3 h-3 mr-1" />}
                          {!isRise && !isFall && (
                            <Minus className="w-3 h-3 mr-1" />
                          )}

                          {/* 2. 등락액 표시 (절대값, 콤마) */}
                          <span className="mr-1">
                            {Math.abs(changeAmount).toLocaleString()}
                          </span>

                          {/* 3. 등락률 배지 (괄호 안에 작게 표시) */}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${bgRateColor} opacity-90`}
                          >
                            {Math.abs(changeRate).toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3 text-right font-bold text-gray-800">
                        {stock.currentAmount.toLocaleString()}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-medium ${isProfit ? "text-red-600" : "text-blue-600"
                          }`}
                      >
                        {isProfit ? "+" : ""}
                        {stock.netProfit.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${isProfit
                            ? "bg-red-50 text-red-600"
                            : "bg-blue-50 text-blue-600"
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

          <div className="md:hidden grid grid-cols-1 gap-4">
            {stockSummaries.map((stock) => (
              <StockSummaryCard key={stock.code} stock={stock} />
            ))}
          </div>
        </div>

        {/* --- Transaction History --- */}
        <div>
          <div className="px-1 py-3 flex justify-between items-end mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" /> 상세 거래 내역
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                개별 건별 매수 시점 기준 데이터입니다. 항목을 클릭하면 상세 정보를 확인할 수 있습니다.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-200 active:scale-95"
            >
              + 거래 추가
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden hidden md:block">
            <div className="max-h-[750px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider">
                      종목명
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider">
                      날짜
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-right">
                      수량
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-right">
                      매수단가
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-right">
                      현재가
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-right">
                      손익
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-right">
                      수익률
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analyzedHoldings.map((item) => {
                    const isItemProfit = item.netProfit >= 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-2">
                          <div className="font-semibold text-gray-700">
                            {item.name}
                          </div>
                        </td>
                        <td className="px-6 py-2">
                          <div className="text-xs text-gray-400 mt-0.5">
                            {item.date}
                          </div>
                        </td>
                        <td className="px-6 py-2 text-right text-gray-600">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-2 text-right text-gray-500">
                          {item.buyPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-2 text-right font-medium">
                          {(item.currentPrice || 0).toLocaleString()}
                        </td>
                        <td
                          className={`px-6 py-2 text-right font-medium ${isItemProfit ? "text-red-500" : "text-blue-500"
                            }`}
                        >
                          {isItemProfit ? "+" : ""}
                          {item.netProfit.toLocaleString()}
                        </td>
                        <td
                          className={`px-6 py-2 text-right font-bold ${isItemProfit ? "text-red-600" : "text-blue-600"
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

          <div className="md:hidden space-y-3">
            {analyzedHoldings.map((item) => {
              const isItemProfit = item.netProfit >= 0;
              return (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer active:bg-gray-50"
                >
                  <div>
                    <div className="font-bold text-gray-700">{item.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.date} · {item.quantity}주
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-bold ${isItemProfit ? "text-red-600" : "text-blue-600"
                        }`}
                    >
                      {isItemProfit ? "+" : ""}
                      {item.returnRate}%
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.buyPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TransactionDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          transaction={selectedTransaction}
          onDelete={removeHolding}
        />

        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddTransaction}
        />

        <CashManagementModal
          isOpen={isCashModalOpen}
          onClose={() => setIsCashModalOpen(false)}
          cashData={cashData}
          onUpdate={updateCash}
        />
      </main>
    </div>
  );
}
