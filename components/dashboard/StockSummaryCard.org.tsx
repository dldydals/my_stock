import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StockSummary } from "./types";

interface Props {
  stock: StockSummary;
}

export const StockSummaryCard: React.FC<Props> = ({ stock }) => {
  const isProfit = stock.netProfit >= 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 border border-gray-100 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 blur-xl ${isProfit ? "bg-red-500" : "bg-blue-500"}`}></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${isProfit ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              {stock.name[0]}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                {stock.name}
              </h3>
              <span className="text-xs text-gray-400 font-mono tracking-wider bg-gray-50 px-1.5 py-0.5 rounded">
                {stock.code}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${isProfit ? "bg-red-100/50 text-red-600" : "bg-blue-100/50 text-blue-600"}`}>
              {isProfit ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {stock.returnRate}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4 bg-gray-50/50 p-3 rounded-xl">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">보유수량</p>
            <p className="font-semibold text-gray-700">{stock.quantity.toLocaleString()}주</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs mb-0.5">평균단가</p>
            <p className="font-semibold text-gray-700">{stock.avgBuyPrice.toLocaleString()}원</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">평가금액</p>
            <p className="font-bold text-gray-900">{stock.currentAmount.toLocaleString()}원</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs mb-0.5">현재가</p>
            <p className={`font-semibold ${isProfit ? "text-red-500" : "text-blue-500"}`}>
              {stock.currentPrice.toLocaleString()}원
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
          <span className="text-sm font-medium text-gray-500">총 손익 (세후)</span>
          <span className={`text-lg font-bold tracking-tight ${isProfit ? "text-red-600" : "text-blue-600"}`}>
             {isProfit ? "+" : ""}{stock.netProfit.toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
};