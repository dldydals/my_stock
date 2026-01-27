'use client';

import React from 'react';
import { Tag, Typography, Row, Col, Progress, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, PieChartOutlined, DollarOutlined, TransactionOutlined } from '@ant-design/icons';

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
}

export default function StockTable({ data, onRowClick }: StockTableProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.map((item) => {
                const isPositive = item.yield >= 0;
                const evaluationAmount = item.currentPrice * item.quantity;

                return (
                    <div
                        key={item.ticker}
                        onClick={() => onRowClick(item)}
                        className={`glass-card group cursor-pointer p-4 rounded-[20px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${item.quantity === 0 ? 'opacity-60 grayscale-[0.7] bg-slate-50/50' : ''}`}
                        style={{ boxShadow: 'var(--card-shadow)' }}
                    >
                        {/* Decorative Background Accent */}
                        <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full opacity-5 blur-2xl ${item.quantity === 0 ? 'bg-gray-400' : (isPositive ? 'bg-red-500' : 'bg-blue-500')}`} />

                        {/* Header: Name & Yield */}
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex flex-col">
                                <Text strong style={{ fontSize: 16, color: 'var(--foreground)', letterSpacing: '-0.5px' }}>{item.name}</Text>
                                <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{item.ticker}</Text>
                            </div>
                            <Tag
                                color={isPositive ? 'red' : 'blue'}
                                style={{
                                    margin: 0,
                                    borderRadius: 6,
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    border: 'none',
                                    fontSize: 12
                                }}
                            >
                                {isPositive ? '+' : ''}{item.yield.toFixed(2)}%
                            </Tag>
                        </div>

                        {/* Primary Value & Stats */}
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>평가금액</Text>
                                <div className="flex items-baseline gap-1">
                                    <Text className="font-numeric" style={{ fontSize: 22, fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-1.2px' }}>
                                        {evaluationAmount.toLocaleString()}
                                    </Text>
                                    <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>원</Text>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>평가손익</Text>
                                <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 800, color: isPositive ? '#ef4444' : '#3b82f6' }}>
                                    {isPositive ? '+' : ''}{Math.round(item.PnL).toLocaleString()}원
                                </Text>
                            </div>
                        </div>

                        {/* Secondary Stats Grid - Restructured for space */}
                        <div className="flex flex-col gap-3 mb-4 bg-slate-50/20 dark:bg-white/5 p-3 rounded-xl border border-slate-100/30 dark:border-white/5">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8' }}>보유수량</Text>
                                    <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{item.quantity.toLocaleString()}<small className="ml-0.5 opacity-50 font-normal">주</small></Text>
                                </div>
                                <div className="flex flex-col items-end">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8' }}>평균단가</Text>
                                    <Text className="font-numeric" style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', opacity: 0.8 }}>{Math.round(item.avgPrice).toLocaleString()}<small className="ml-0.5 opacity-50 font-normal text-[9px]">원</small></Text>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/20 dark:border-white/10">
                                <Text type="secondary" style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 2 }}>현재가 (전일대비 변동)</Text>
                                <div className="flex justify-between items-baseline">
                                    <Text className="font-numeric" style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>{item.currentPrice.toLocaleString()}<small className="ml-0.5 opacity-50 font-normal text-[9px]">원</small></Text>
                                    <div className="flex items-center gap-1.5 bg-slate-100/30 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                        <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: item.changeRate > 0 ? '#ef4444' : item.changeRate < 0 ? '#3b82f6' : '#94a3b8' }}>
                                            {item.changeRate > 0 ? '▲' : item.changeRate < 0 ? '▼' : ''}{(item.currentPrice * Math.abs(item.changeRate / 100) / (1 + (item.changeRate / 100))).toFixed(0).toLocaleString()}
                                        </Text>
                                        <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: item.changeRate > 0 ? '#ef4444' : item.changeRate < 0 ? '#3b82f6' : '#94a3b8' }}>
                                            ({item.changeRate > 0 ? '+' : ''}{item.changeRate.toFixed(2)}%)
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Allocation */}
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-1">
                                <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>Portfolio %</Text>
                                <Text className="font-numeric" style={{ fontSize: 10, fontWeight: 800, color: 'var(--foreground)' }}>{item.allocation.toFixed(1)}%</Text>
                            </div>
                            <Progress
                                percent={item.allocation}
                                showInfo={false}
                                size={{ height: 4 }}
                                strokeColor={isPositive ? '#ef4444' : '#3b82f6'}
                                railColor="rgba(128, 128, 128, 0.1)"
                            />
                        </div>

                        {/* Hover Indicator */}
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                );
            })}
        </div>
    );
}
