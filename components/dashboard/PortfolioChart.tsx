import React, { useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StockSummary } from "./types";
import { COLORS } from "./constants";

interface Props {
  stockSummaries: StockSummary[];
}

export const PortfolioChart: React.FC<Props> = ({ stockSummaries }) => {
  
  // 1. 데이터를 금액(비율)이 큰 순서대로 정렬합니다. (내림차순)
  const sortedData = useMemo(() => {
    // 원본 배열을 복사([...])한 후 정렬해야 안전합니다.
    return [...stockSummaries].sort((a, b) => b.currentAmount - a.currentAmount);
  }, [stockSummaries]);

  // 1. 비율 계산을 위해 전체 자산 총액을 먼저 구합니다.
  const totalValue = useMemo(() => {
    return sortedData.reduce((sum, item) => sum + item.currentAmount, 0);
  }, [sortedData]);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col">
      <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-2">
        <PieChartIcon className="w-4 h-4 text-indigo-500" /> 자산 구성
      </h2>
      <div className="flex-1 min-h-[300px] relative w-full h-full" >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="40%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="currentAmount"
              nameKey="name"
              cornerRadius={6}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${value.toLocaleString()}원`}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: "0px", 
                        marginTop: "-20px"
                  }}
              formatter={(value, entry: any) => {
                // 현재 항목의 금액을 가져옵니다.
                const currentAmount = entry.payload.currentAmount;
                // 비율 계산 (소수점 반올림)
                const percent = ((currentAmount / totalValue) * 100).toFixed(1);
                
                return (
                 <span className="text-xs font-medium text-slate-500 ml-1 mr-2 inline-block mb-0">
                  {value}<span className="text-slate-400">({percent}%)</span>
                  </span>
              );
            }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-[29%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-xs text-gray-400 block mb-1">Total</span>
          <span className="text-xl font-bold text-gray-800">100%</span>
        </div>
      </div>
    </div>
  );
};