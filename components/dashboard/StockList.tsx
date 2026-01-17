// components/dashboard/StockList.tsx
import React from "react";
import { AnalyzedHolding } from "./types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  holdings: AnalyzedHolding[];
}

export const StockList: React.FC<Props> = ({ holdings }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">보유 종목 상세</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">종목명</th>
              <th className="px-6 py-4 text-right">현재가 (등락률)</th>
              <th className="px-6 py-4 text-right">매수평단가</th>
              <th className="px-6 py-4 text-right">보유수량</th>
              <th className="px-6 py-4 text-right">투자지표 (PER/배당)</th>
              <th className="px-6 py-4 text-right">평가손익</th>
              <th className="px-6 py-4 text-right">수익률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {holdings.map((item) => {
              const isProfit = item.netProfit >= 0;
              const changeRate = item.change_rate || 0;
              const isRise = changeRate > 0;
              const isFall = changeRate < 0;
              const rateColor = isRise ? "text-red-500" : isFall ? "text-blue-500" : "text-gray-500";

              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className="text-xs text-gray-400">{item.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${rateColor}`}>
                        {item.currentPrice.toLocaleString()}원
                      </span>
                      <span className={`text-xs flex items-center ${rateColor}`}>
                         {isRise && <TrendingUp className="w-3 h-3 mr-1" />}
                         {isFall && <TrendingDown className="w-3 h-3 mr-1" />}
                         {changeRate.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {item.buyPrice.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {item.quantity}주
                  </td>
                  
                  {/* 추가된 정보: PER / 배당률 표시 */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end text-xs text-gray-500 space-y-0.5">
                      {item.per && item.per > 0 ? (
                        <span>PER <span className="text-gray-700 font-medium">{item.per.toFixed(2)}</span>배</span>
                      ) : (
                        <span>PER -</span>
                      )}
                      {item.dividend_yield && item.dividend_yield > 0 ? (
                         <span className="text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                           배당 {item.dividend_yield}%
                         </span>
                      ) : null}
                    </div>
                  </td>

                  <td className={`px-6 py-4 text-right font-medium ${isProfit ? "text-red-500" : "text-blue-500"}`}>
                    {isProfit ? "+" : ""}{item.netProfit.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isProfit ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {item.returnRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};