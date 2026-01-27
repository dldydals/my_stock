// components/dashboard/StockSummaryCard.tsx
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { StockSummary } from "./types";

interface Props {
  stock: StockSummary;
}

export const StockSummaryCard: React.FC<Props> = ({ stock }) => {
  const isProfit = stock.netProfit >= 0;

  // 등락률(전일 대비)에 따른 색상 및 아이콘 결정
  const changeRate = stock.change_rate || 0;
  const isRise = changeRate > 0;
  const isFall = changeRate < 0;

  const rateColor = isRise ? "text-red-500" : isFall ? "text-blue-500" : "text-gray-500";
  const bgRateColor = isRise ? "bg-red-50" : isFall ? "bg-blue-50" : "bg-gray-50";

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {/* 상단: 종목명 및 현재가/등락률 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            {stock.name}
            <span className="text-xs text-gray-400 font-normal">{stock.code}</span>
          </h3>

          <div className="flex items-center gap-2 mt-1">
            <span className={`text-2xl font-bold ${rateColor}`}>
              {(stock.currentPrice || 0).toLocaleString()}원
            </span>
            {/* 등락률 배지 */}
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] text-gray-400 font-medium ml-0.5">전일대비</span>
              <div className={`flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${bgRateColor} ${rateColor}`}>
                {isRise && <TrendingUp className="w-3 h-3 mr-0.5" />}
                {isFall && <TrendingDown className="w-3 h-3 mr-0.5" />}
                {!isRise && !isFall && <Minus className="w-3 h-3 mr-0.5" />}
                {Math.abs(changeRate).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* 우측 상단: 총 수익률 배지 */}
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isProfit ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
          {isProfit ? "+" : ""}{stock.returnRate}%
        </div>
      </div>

      {/* 중간: 보유량 및 평가금액 */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-400 text-xs mb-1">보유 수량</div>
          <div className="font-semibold text-gray-700">{stock.quantity}주</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs mb-1">평가 금액</div>
          <div className="font-semibold text-gray-700">{stock.currentAmount.toLocaleString()}원</div>
        </div>
      </div>

      <div className="border-t border-gray-100 my-3"></div>

      {/* 하단: 손익 및 펀더멘털 정보 (PER, PBR, 배당) */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-gray-400 text-xs mb-1">총 손익</div>
          <div className={`font-bold text-sm ${isProfit ? "text-red-500" : "text-blue-500"}`}>
            {isProfit ? "+" : ""}{Math.round(stock.netProfit).toLocaleString()}원
          </div>
        </div>

        {/* 펀더멘털 정보가 있을 때만 표시 */}
        <div className="flex gap-2 text-[10px] text-gray-500">
          {/* 데이터가 없으면 표시하지 않음 (조건부 렌더링) */}
          {/* 예: PER 정보 등을 표시하고 싶다면 StockSummary 타입에 per 등을 추가해서 전달해야 함 */}
          {/* 현재는 UI 공간만 잡아둡니다. */}
        </div>
      </div>
    </div>
  );
};