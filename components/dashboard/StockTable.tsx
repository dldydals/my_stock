"use client";

import { MessageOutlined, ThunderboltFilled } from "@ant-design/icons";
import { Tag, Typography, Progress, Popover, Space, Tooltip } from "antd";
import { StrategyData } from "./types";

const { Text } = Typography;

interface StockData {
  key: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  changeRate: number;
  yield: number;
  PnL: number;
  allocation: number;
  strategy?: any;
}

interface StockTableProps {
  data: StockData[];
  onRowClick: (record: StockData) => void;
  aiReport?: any;
}

const formatSupplyVolume = (val: number | undefined) => {
  if (!val) return "-";
  const absVal = Math.abs(val);
  if (absVal >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
  if (absVal >= 10000) return `${(val / 10000).toFixed(0)}만`;
  return val.toLocaleString();
};

export default function StockTable({
  data,
  onRowClick,
  aiReport,
}: StockTableProps) {
  const holdingsAnalysis = aiReport?.holdings_analysis || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.map((item, index) => {
        const isPositive = item.changeRate > 0;
        const evaluationAmount = item.currentPrice * item.quantity;
        const strat = item.strategy || {};

        // ▼▼▼ [핵심 수정] 백엔드 변수명(foreigner 등)과 매핑 ▼▼▼
        // 백엔드에서 보내주는 키값: foreigner, institution, individual
        const foreignNet = strat.foreigner ?? strat.foreign_buy ?? 0;
        const orgNet = strat.institution ?? strat.org_buy ?? 0;
        const indiNet = strat.individual ?? strat.individual_buy ?? 0;
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        const analysis = holdingsAnalysis.find(
          (a: any) => a.name === item.name || a.ticker === item.ticker
        );

        let outlookColor = "default";
        if (analysis?.outlook.includes("호재")) outlookColor = "error";
        if (analysis?.outlook.includes("악재")) outlookColor = "processing";

        const absYield = Math.abs(item.yield);
        let alpha = 0.05;
        let hasGlow = false;
        if (absYield >= 20) {
          alpha = 0.25;
          hasGlow = true;
        } else if (absYield >= 10) alpha = 0.2;
        else if (absYield >= 6) alpha = 0.15;
        else if (absYield >= 3) alpha = 0.1;

        const bgBaseColor = isPositive ? "239, 68, 68" : "59, 130, 246";

        const headerHeatmapStyle =
          item.quantity > 0 && item.yield !== 0
            ? {
                background: `linear-gradient(135deg, rgba(${bgBaseColor}, ${alpha * 1.5}), rgba(${bgBaseColor}, ${alpha * 0.5}))`,
                borderBottom: `1px solid rgba(${bgBaseColor}, 0.2)`,
              }
            : {};

        const isNearTarget =
          analysis?.target_price > 0 &&
          Math.abs(item.currentPrice - analysis.target_price) /
            item.currentPrice <=
            0.01;

        return (
          <div
            key={item.ticker || index}
            onClick={() => onRowClick(item)}
            className={`glass-card group cursor-pointer rounded-[20px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden 
                            ${item.quantity === 0 ? "opacity-60 grayscale-[0.7] bg-slate-50/50" : ""}
                            ${hasGlow ? (isPositive ? "glow-red" : "glow-blue") : ""}
                            ${isNearTarget ? "blink-animation" : ""}`}
            style={{
              boxShadow: "var(--card-shadow)",
              border: isNearTarget
                ? undefined
                : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              className={`absolute -right-10 -top-10 w-24 h-24 rounded-full opacity-5 blur-2xl ${item.quantity === 0 ? "bg-gray-400" : isPositive ? "bg-red-500" : "bg-blue-500"}`}
            />

            {/* ■■■■■ HEADER ■■■■■ */}
            <div className="p-4 relative z-10" style={headerHeatmapStyle}>
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                  <Text strong style={{ fontSize: 16, color: "var(--foreground)", letterSpacing: "-0.5px", lineHeight: 1.2, marginBottom: 10 }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: '"JetBrains Mono", monospace' }}>
                    {item.ticker}
                  </Text>
                </div>

                <div className="flex flex-col items-end justify-center pr-2 border-r border-white/10">
                  {analysis && (
                    <Popover content={<div className="max-w-[280px] p-1"><Text className="text-xs text-slate-600 block mb-2">{analysis.analysis}</Text></div>} title={<Text strong className="text-xs"><MessageOutlined className="mr-1" /> AI 분석</Text>} trigger="hover">
                      <Tag color={outlookColor} className="rounded-md px-1.5 py-0 border-none cursor-help text-[9px] m-0 shadow-sm font-bold h-[18px] leading-[18px]">
                        {analysis.outlook}
                      </Tag>
                    </Popover>
                  )}
                  <Text className="font-numeric" style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", lineHeight: 1, marginBottom: 8 }}>
                    {item.currentPrice.toLocaleString()}
                  </Text>
                  <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded ${item.changeRate > 0 ? "bg-red-500/20" : item.changeRate < 0 ? "bg-blue-500/20" : "bg-slate-500/20"}`}>
                    <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: item.changeRate > 0 ? "#fca5a5" : item.changeRate < 0 ? "#93c5fd" : "#cbd5e1" }}>
                      {item.changeRate > 0 ? "▲" : item.changeRate < 0 ? "▼" : ""}
                      {Math.abs((item.currentPrice * (item.changeRate / 100)) / (1 + item.changeRate / 100)).toFixed(0).toLocaleString()}
                    </Text>
                    <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: item.changeRate > 0 ? "#fca5a5" : item.changeRate < 0 ? "#93c5fd" : "#cbd5e1" }}>
                      ({Math.abs(item.changeRate).toFixed(2)}%)
                    </Text>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center gap-0.5">
                  <div className="flex items-center justify-end gap-2">
                    <Text style={{ fontSize: 10, fontWeight: 600, color: "#93c5fd" }}>단기매수</Text>
                    <Text className="font-numeric" style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", minWidth: 50, textAlign: "right" }}>
                      {(analysis?.buy_price || 0) > 0 ? (analysis?.buy_price || 0).toLocaleString() : "-"}
                    </Text>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Text style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5" }}>단기매도</Text>
                    <Text className="font-numeric" style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", minWidth: 50, textAlign: "right" }}>
                      {(analysis?.target_price || 0) > 0 ? (analysis?.target_price || 0).toLocaleString() : "-"}
                    </Text>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Text style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>손절가</Text>
                    <Text className="font-numeric" style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", minWidth: 50, textAlign: "right" }}>
                      {(analysis?.stop_loss || 0) > 0 ? (analysis?.stop_loss || 0).toLocaleString() : "-"}
                    </Text>
                  </div>
                </div>
              </div>
            </div>

            {/* ■■■■■ BODY ■■■■■ */}
            <div className="p-4">
              {/* Row 1: 평가금액 vs 수익률 */}
              <div className="flex justify-between items-end mb-4 relative z-10">
                <div>
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0", display: "block" }}>평가금액</Text>
                  <div className="flex items-baseline gap-1">
                    <Text className="font-numeric" style={{ fontSize: 22, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-1.2px" }}>
                      {evaluationAmount.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>원</Text>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0" }}>수익 (손익률)</Text>
                  <div className="flex flex-col items-end">
                    <Text className="font-numeric" style={{ fontSize: 16, fontWeight: 800, color: item.yield > 0 ? "#fca5a5" : "#93c5fd" }}>
                      {item.yield > 0 ? "+" : ""} {Math.round(item.PnL).toLocaleString()}
                    </Text>
                    <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 600, color: item.yield > 0 ? "#fca5a5" : "#93c5fd", opacity: 0.8 }}>
                      ({item.yield > 0 ? "+" : ""} {item.yield.toFixed(2)}%)
                    </Text>
                  </div>
                </div>
              </div>

              {/* ▼▼▼ 수급 및 전략 정보 섹션 ▼▼▼ */}
              {strat && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {/* 1. 수급 정보 (변수명 수정됨) */}
                  <div className="bg-black/20 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center gap-1">
                    <div className="flex justify-between items-center">
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>외인</Text>
                      <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: foreignNet > 0 ? "#fca5a5" : foreignNet < 0 ? "#93c5fd" : "#cbd5e1" }}>
                        {formatSupplyVolume(foreignNet)}
                      </Text>
                    </div>
                    <div className="flex justify-between items-center">
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>기관</Text>
                      <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: orgNet > 0 ? "#fca5a5" : orgNet < 0 ? "#93c5fd" : "#cbd5e1" }}>
                        {formatSupplyVolume(orgNet)}
                      </Text>
                    </div>
                    <div className="flex justify-between items-center">
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>개인</Text>
                      <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: indiNet > 0 ? "#fca5a5" : indiNet < 0 ? "#93c5fd" : "#cbd5e1" }}>
                        {formatSupplyVolume(indiNet)}
                      </Text>
                    </div>
                  </div>

                  {/* 2. 전략 정보 (RSI 툴팁 적용됨) */}
                  <div className="bg-black/20 rounded-xl p-2.5 border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1">
                      <Space size={4}>
                        <ThunderboltFilled style={{ fontSize: 10, color: "#fbbf24" }} />
                        <Text style={{ fontSize: 10, color: "#e2e8f0", fontWeight: 700 }}>Strategy</Text>
                      </Space>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Tooltip 
                        title={
                          <div className="text-xs space-y-1">
                            <div className="font-bold border-b border-white/20 pb-1 mb-1">RSI (상대강도지수)</div>
                            <p>주가의 과매수/과매도 구간을 판단하는 지표입니다.</p>
                            <div className="flex items-center gap-2"><span className="text-red-300 font-bold">70↑</span> <span>과매수 (매도 고려)</span></div>
                            <div className="flex items-center gap-2"><span className="text-blue-300 font-bold">30↓</span> <span>과매도 (매수 고려)</span></div>
                          </div>
                        }
                        styles={{ body:{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)" }}}
                      >
                        <Text style={{ fontSize: 10, color: "#94a3b8", cursor: "help", borderBottom: "1px dashed #64748b" }}>RSI(14)</Text>
                      </Tooltip>
                      
                      <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: (strat.rsi || 0) >= 70 ? "#fca5a5" : (strat.rsi || 0) <= 30 ? "#93c5fd" : "#cbd5e1" }}>
                        {strat.rsi ? strat.rsi.toFixed(1) : "-"}
                      </Text>
                    </div>

                    <div className="flex justify-end mt-1">
                      {strat.action ? (
                        <Tag color={strat.action === "BUY" ? "red" : strat.action === "SELL" ? "blue" : "default"} style={{ margin: 0, fontSize: 10, fontWeight: 800, padding: "0 6px" }}>
                          {strat.action}
                        </Tag>
                      ) : (
                        <Text style={{ fontSize: 10, color: "#64748b" }}>-</Text>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Row 2: 보유수량 & 평균단가 */}
              <div className="flex justify-between items-center mb-4 bg-black/20 p-3 rounded-xl border border-white/5 relative z-10">
                <div className="flex flex-col">
                  <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: "#cbd5e1" }}>보유수량</Text>
                  <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                    {item.quantity.toLocaleString()} <small className="ml-0.5 opacity-50 font-normal">주</small>
                  </Text>
                </div>
                <div className="flex flex-col items-end">
                  <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: "#cbd5e1" }}>평균단가</Text>
                  <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", opacity: 0.8 }}>
                    {Math.round(item.avgPrice).toLocaleString()} <small className="ml-0.5 opacity-50 font-normal text-[9px]">원</small>
                  </Text>
                </div>
              </div>

              {/* Footer: Allocation */}
              <div className="pt-2 relative z-10 border-t border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, color: "#cbd5e1" }}>Portfolio %</Text>
                  <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: "var(--foreground)" }}>
                    {item.allocation.toFixed(1)}%
                  </Text>
                </div>
                <Progress percent={item.allocation} showInfo={false} size={{ height: 4 }} strokeColor={item.yield > 0 ? "#ef4444" : "#3b82f6"} railColor="rgba(255, 255, 255, 0.1)" />
              </div>

              {/* Hover Indicator */}
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />
            </div>
          </div>
        );
      })}
    </div>
  );
}