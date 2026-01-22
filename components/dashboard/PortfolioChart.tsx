import React, { useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StockSummary } from "./types";
import { COLORS } from "./constants";

interface Props {
  stockSummaries: StockSummary[];
}

// 라디안 계산을 위한 상수
const RADIAN = Math.PI / 180;

export const PortfolioChart: React.FC<Props> = ({ stockSummaries }) => {
  
  const sortedData = useMemo(() => {
    return [...stockSummaries].sort((a, b) => b.currentAmount - a.currentAmount);
  }, [stockSummaries]);

  const totalValue = useMemo(() => {
    return sortedData.reduce((sum, item) => sum + item.currentAmount, 0);
  }, [sortedData]);

  // 🔹 커스텀 레이블 렌더링 함수 (그래프 옆에 % 표시)
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    // 1% 미만인 섹션은 레이블을 숨겨서 겹침 방지 (필요 시 제거 가능)
    if (percent < 0.01) return null;

    // 레이블 위치 계산 (outerRadius보다 20px 바깥쪽)
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={COLORS[index % COLORS.length]} // 해당 섹션과 같은 색상 사용
        // fill="#6b7280" // 회색으로 통일하고 싶다면 이 줄 사용
        textAnchor={x > cx ? 'start' : 'end'} // 좌우 위치에 따라 정렬 변경
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

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
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="currentAmount"
              nameKey="name"
              cornerRadius={6}
              // 👇 여기에 label 속성을 추가했습니다.
              label={renderCustomizedLabel} 
              labelLine={true} // 지시선 표시 (false로 하면 선이 사라짐)
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
              wrapperStyle={{ paddingTop: "0px", marginTop: "10px", marginBottom: "0px"}} // 마진 약간 조정
              formatter={(value, entry: any) => {
                const currentAmount = entry.payload.currentAmount;
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
        
        {/* 가운데 텍스트 위치 조정 (레이블과 겹치지 않게 주의) */}
        <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-xs text-gray-400 block mb-1">Total</span>
          <span className="text-xl font-bold text-gray-800">100%</span>
        </div>
      </div>
    </div>
  );
};