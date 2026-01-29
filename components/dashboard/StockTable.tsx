'use client';

import { MessageOutlined } from '@ant-design/icons';
import { Tag, Typography, Progress, Popover } from 'antd';

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
                const isPositive = item.changeRate > 0; // 헤더 색상 기준 (전일대비 변동)
                // const isPositiveYield = item.yield > 0; // 수익률 기준 색상용 (필요시 사용)
                const evaluationAmount = item.currentPrice * item.quantity;

                // AI 분석 데이터 매칭
                const analysis = holdingsAnalysis.find((a: any) => a.name === item.name || a.ticker === item.ticker);
                
                // AI Outlook 색상 결정
                let outlookColor = 'default';
                if (analysis?.outlook.includes('호재')) outlookColor = 'error'; // 빨강
                if (analysis?.outlook.includes('악재')) outlookColor = 'processing'; // 파랑

                // 히트맵(배경색) 로직
                const absYield = Math.abs(item.yield);
                let alpha = 0.05;
                let hasGlow = false;
                if (absYield >= 20) { alpha = 0.25; hasGlow = true; }
                else if (absYield >= 10) alpha = 0.20;
                else if (absYield >= 6) alpha = 0.15;
                else if (absYield >= 3) alpha = 0.10;

                const bgBaseColor = isPositive ? '239, 68, 68' : '59, 130, 246'; // Red or Blue

                // 헤더 스타일 (그라데이션)
                const headerHeatmapStyle = (item.quantity > 0 && item.yield !== 0) ? {
                    background: `linear-gradient(135deg, rgba(${bgBaseColor}, ${alpha * 1.5}), rgba(${bgBaseColor}, ${alpha * 0.5}))`,
                    borderBottom: `1px solid rgba(${bgBaseColor}, 0.2)`,
                } : {};

                // 목표가 근접 시 깜빡임 효과
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
                        {/* 배경 장식 효과 */}
                        <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full opacity-5 blur-2xl ${item.quantity === 0 ? 'bg-gray-400' : (isPositive ? 'bg-red-500' : 'bg-blue-500')}`} />

                        {/* ■■■■■■■■■■ HEADER: 종목정보 & AI 가격 분석 ■■■■■■■■■■ */}
                        {/* ■■■■■■■■■■ HEADER: 3등분 (가운데 칸 우측 정렬 적용) ■■■■■■■■■■ */}
                        <div className="p-4 relative z-10" style={headerHeatmapStyle}>
                            {/* 1fr(나머지 다) / auto(글자만큼) / auto(글자만큼) + gap-4(간격조절) */}
                            <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                                
                                {/* 1. 좌측 (Left): 종목명 / 티커 / AI 배지 */}
                                <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                                    <Text strong style={{
                                        fontSize: 16, color: 'var(--foreground)', letterSpacing: '-0.5px',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        maxWidth: '100%', lineHeight: 1.2, marginBottom: 10
                                    }}>
                                        {item.name}
                                    </Text>
                                    <div className="flex items-center gap-1.5">
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: '"JetBrains Mono", monospace' }}>
                                            {item.ticker}
                                        </Text>
                                        {analysis && (
                                            <Popover
                                                content={<div className="max-w-[280px] p-1"><Text className="text-xs text-slate-600 block mb-2">{analysis.analysis}</Text></div>}
                                                title={<Text strong className="text-xs"><MessageOutlined className="mr-1" /> AI 정밀 분석</Text>}
                                                trigger="hover"
                                            >
                                                <Tag color={outlookColor} className="rounded-md px-1.5 py-0 border-none cursor-help text-[9px] m-0 shadow-sm font-bold h-[18px] leading-[18px]">
                                                    {analysis.outlook}
                                                </Tag>
                                            </Popover>
                                        )}
                                    </div>
                                </div>

                                {/* 2. 중앙 (Center): 현재가 (우측 정렬됨!) */}
                                {/* items-center를 items-end로 변경하여 오른쪽으로 붙임 */}
                                <div className="flex flex-col items-end justify-center pr-2 border-r border-white/10"> 
                                    {/* 현재가 */}
                                    <Text className="font-numeric" style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1, marginBottom: 8 }}>
                                        {item.currentPrice.toLocaleString()}
                                    </Text>
                                    
                                    {/* 등락폭 및 등락률 */}
                                    <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded ${item.changeRate > 0 ? 'bg-red-500/20' : item.changeRate < 0 ? 'bg-blue-500/20' : 'bg-slate-500/20'}`}>
                                        <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: item.changeRate > 0 ? '#fca5a5' : item.changeRate < 0 ? '#93c5fd' : '#cbd5e1' }}>
                                            {item.changeRate > 0 ? '▲' : item.changeRate < 0 ? '▼' : ''}
                                            {Math.abs((item.currentPrice * (item.changeRate / 100)) / (1 + (item.changeRate / 100))).toFixed(0).toLocaleString()}
                                        </Text>
                                        <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 700, color: item.changeRate > 0 ? '#fca5a5' : item.changeRate < 0 ? '#93c5fd' : '#cbd5e1' }}>
                                            ({Math.abs(item.changeRate).toFixed(2)}%)
                                        </Text>
                                    </div>
                                </div>

                                {/* 3. 우측 (Right): 매수추천가 / 매도(목표)추천가 */}
                                <div className="flex flex-col items-end gap-1">
                                    {/* 매수추천가 */}
                                    <div className="flex flex-col items-end">
                                        <Text style={{ fontSize: 9, fontWeight: 600, color: '#93c5fd', lineHeight: 1 }}>단기 매수가</Text>
                                        <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                                            {(analysis?.buy_price || 0) > 0 ? (analysis?.buy_price || 0).toLocaleString() : '-'}
                                        </Text>
                                    </div>

                                    {/* 목표가 (매도추천) */}
                                    <div className="flex flex-col items-end">
                                        <Text style={{ fontSize: 9, fontWeight: 600, color: '#fca5a5', lineHeight: 1 }}>단기 매도가</Text>
                                        <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                                            {(analysis?.target_price || 0) > 0 ? (analysis?.target_price || 0).toLocaleString() : '-'}
                                        </Text>
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
                                    <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>수익 (손익률)</Text>
                                    <div className="flex items-center gap-1.5">
                                        <Text className="font-numeric" style={{ fontSize: 16, fontWeight: 800, color: item.yield > 0 ? '#fca5a5' : '#93c5fd' }}>
                                            {item.yield > 0 ? '+' : ''} {Math.round(item.PnL).toLocaleString()}
                                        </Text>
                                        <Text className="font-numeric" style={{ fontSize: 11, fontWeight: 600, color: item.yield > 0 ? '#fca5a5' : '#93c5fd', opacity: 0.8 }}>
                                            ({item.yield > 0 ? '+' : ''}{item.yield.toFixed(2)}%)
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

                            {/* Footer: Allocation */}
                            <div className="pt-2 relative z-10 border-t border-white/10">
                                <div className="flex justify-between items-center mb-1">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1' }}>Portfolio %</Text>
                                    <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: 'var(--foreground)' }}>{item.allocation.toFixed(1)}%</Text>
                                </div>
                                <Progress
                                    percent={item.allocation}
                                    showInfo={false}
                                    size={{ height: 4 }}
                                    strokeColor={item.yield > 0 ? '#ef4444' : '#3b82f6'}
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