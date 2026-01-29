'use client';

import { ArrowUpOutlined, ArrowDownOutlined, PieChartOutlined, DollarOutlined, TransactionOutlined, MessageOutlined } from '@ant-design/icons';
import { Tag, Typography, Row, Col, Progress, Space, Popover } from 'antd';

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
}

interface StockTableProps {
    data: StockData[];
    onRowClick: (record: StockData) => void;
    aiReport?: any;
}

export default function StockTable({ data, onRowClick, aiReport }: StockTableProps) {
    const holdingsAnalysis = aiReport?.holdings_analysis || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.map((item) => {
                const isPositive = item.yield > 0;
                const isNegative = item.yield < 0;
                const evaluationAmount = item.currentPrice * item.quantity;

                // Find matching AI analysis
                const analysis = holdingsAnalysis.find((a: any) => a.name === item.name || a.ticker === item.ticker);
                let outlookColor = 'default';
                if (analysis?.outlook.includes('호재')) outlookColor = 'error';
                if (analysis?.outlook.includes('악재')) outlookColor = 'processing';

                // Heatmap logic
                const absYield = Math.abs(item.yield);
                let alpha = 0.05;
                let hasGlow = false;
                if (absYield >= 20) { alpha = 0.25; hasGlow = true; }
                else if (absYield >= 10) alpha = 0.20;
                else if (absYield >= 6) alpha = 0.15;
                else if (absYield >= 3) alpha = 0.10;

                const bgBaseColor = isPositive ? '239, 68, 68' : '59, 130, 246'; // Red or Blue

                // Header-only heatmap logic
                const headerHeatmapStyle = (item.quantity > 0 && item.yield !== 0) ? {
                    background: `linear-gradient(135deg, rgba(${bgBaseColor}, ${alpha * 1.5}), rgba(${bgBaseColor}, ${alpha * 0.5}))`,
                    borderBottom: `1px solid rgba(${bgBaseColor}, 0.2)`,
                } : {};

                // Blinking logic
                const isNearTarget = analysis?.target_price > 0 &&
                    Math.abs(item.currentPrice - analysis.target_price) / item.currentPrice <= 0.01;

                return (
                    <div
                        key={item.ticker}
                        onClick={() => onRowClick(item)}
                        className={`glass-card group cursor-pointer rounded-[20px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden 
                    ${item.quantity === 0 ? 'opacity-60 grayscale-[0.7] bg-slate-50/50' : ''}
                    ${hasGlow ? (isPositive ? 'glow-red' : 'glow-blue') : ''}
                    ${isNearTarget ? 'blink-animation' : ''}`}
                        style={{
                            boxShadow: 'var(--card-shadow)',
                            border: isNearTarget ? undefined : '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {/* Decorative Background Accent */}
                        <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full opacity-5 blur-2xl ${item.quantity === 0 ? 'bg-gray-400' : (isPositive ? 'bg-red-500' : 'bg-blue-500')}`} />

                        {/* ■■■■■■■■■■ HEADER: 시장 정보 (종목, 티커, 현재가) ■■■■■■■■■■ */}
                        <div className="p-4 relative z-10" style={headerHeatmapStyle}>
                            <div className="flex justify-between items-start">
                                {/* 1. 좌측: 종목명, 티커, AI 분석 */}
                                <div className="flex flex-col gap-1 overflow-hidden" style={{ maxWidth: '60%' }}>
                                    {/* 종목명 */}
                                    <Text strong style={{
                                        fontSize: 16, color: 'var(--foreground)', letterSpacing: '-0.5px',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {item.name}
                                    </Text>

                                    {/* 티커 & AI Badge */}
                                    <div className="flex items-center gap-2">
                                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0' }}>
                                            {item.ticker}
                                        </Text>
                                        {analysis && (
                                            <Popover
                                                content={
                                                    <div className="max-w-[280px] p-1">
                                                        <Text className="text-xs leading-relaxed text-slate-600 block mb-2">{analysis.analysis}</Text>
                                                        {analysis.target_price > 0 && (
                                                            <Tag color="gold" className="text-[10px]">목표가: {analysis.target_price.toLocaleString()}원</Tag>
                                                        )}
                                                    </div>
                                                }
                                                title={<Text strong className="text-xs"><MessageOutlined className="mr-1" /> AI 정밀 분석</Text>}
                                                trigger="hover"
                                            >
                                                <Tag color={outlookColor} className="rounded-full px-2 py-0 border-none cursor-help text-[10px] m-0">
                                                    {analysis.outlook}
                                                </Tag>
                                            </Popover>
                                        )}
                                    </div>
                                </div>

                                {/* 2. 우측: 현재가 레이블, 값, 등락폭 (오른쪽 정렬) */}
                                <div className="flex flex-col items-end gap-0.5">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: '#cbd5e1' }}>현재가</Text>
                                    <div className="flex flex-col items-end">
                                        {/* 현재가 값 */}
                                        <Text className="font-numeric" style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>
                                            {item.currentPrice.toLocaleString()}
                                            <small className="ml-0.5 opacity-50 font-normal text-[9px]">원</small>
                                        </Text>
                                        {/* 등락폭 (Box 스타일) */}
                                        <div className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded mt-1">
                                            <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: item.changeRate > 0 ? '#fca5a5' : item.changeRate < 0 ? '#93c5fd' : '#94a3b8' }}>
                                                {item.changeRate > 0 ? '▲' : item.changeRate < 0 ? '▼' : ''}{(item.currentPrice * Math.abs(item.changeRate / 100) / (1 + (item.changeRate / 100))).toFixed(0).toLocaleString()}
                                            </Text>
                                            <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: item.changeRate > 0 ? '#fca5a5' : item.changeRate < 0 ? '#93c5fd' : '#94a3b8' }}>
                                                ({item.changeRate > 0 ? '+' : ''}{item.changeRate.toFixed(2)}%)
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ■■■■■■■■■■ BODY: 내 자산 정보 (평가금액, 수익률, 수량) ■■■■■■■■■■ */}
                        <div className="p-4">
                            {/* Row 1: 평가금액 vs 수익률/평가손익 */}
                            <div className="flex justify-between items-end mb-4 relative z-10">
                                {/* 평가금액 */}
                                <div>
                                    <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', display: 'block' }}>평가금액</Text>
                                    <div className="flex items-baseline gap-1">
                                        <Text className="font-numeric" style={{ fontSize: 22, fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-1.2px' }}>
                                            {evaluationAmount.toLocaleString()}
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>원</Text>
                                    </div>
                                </div>
                                {/* 수익률 및 평가손익 */}
                                <div className="flex flex-col items-end">
                                    <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>수익률 (손익)</Text>
                                    <div className="flex items-center gap-1.5">
                                        <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 800, color: isPositive ? '#fca5a5' : '#93c5fd' }}>
                                            {isPositive ? '+' : ''}{item.yield.toFixed(2)}%
                                        </Text>
                                        <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 600, color: isPositive ? '#fca5a5' : '#93c5fd', opacity: 0.8 }}>
                                            ({isPositive ? '+' : ''}{Math.round(item.PnL).toLocaleString()})
                                        </Text>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: 보유수량 & 평균단가 (회색 박스) */}
                            <div className="flex justify-between items-center mb-4 bg-black/20 p-3 rounded-xl border border-white/5 relative z-10">
                                <div className="flex flex-col">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: '#cbd5e1' }}>보유수량</Text>
                                    <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                                        {item.quantity.toLocaleString()}<small className="ml-0.5 opacity-50 font-normal">주</small>
                                    </Text>
                                </div>
                                <div className="flex flex-col items-end">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: '#cbd5e1' }}>평균단가</Text>
                                    <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', opacity: 0.8 }}>
                                        {Math.round(item.avgPrice).toLocaleString()}<small className="ml-0.5 opacity-50 font-normal text-[9px]">원</small>
                                    </Text>
                                </div>
                            </div>

                            {/* Footer: Allocation (유지) */}
                            <div className="pt-2 relative z-10 border-t border-white/10">
                                <div className="flex justify-between items-center mb-1">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1' }}>Portfolio %</Text>
                                    <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: 'var(--foreground)' }}>{item.allocation.toFixed(1)}%</Text>
                                </div>
                                <Progress
                                    percent={item.allocation}
                                    showInfo={false}
                                    size={{ height: 4 }}
                                    strokeColor={isPositive ? '#ef4444' : '#3b82f6'}
                                    railColor="rgba(255, 255, 255, 0.1)"
                                />
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
