'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tooltip, Typography, Space, Divider, Button, InputNumber } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SummaryStatsProps {
    totalAssets: number;
    todayPnL: number;
    totalBuyAmount: number;
    cashDeposit: number;
    cashCma: number;
    totalCumulativeDeposit: number;
    totalCumulativeWithdrawal: number;
    onUpdateCash: (data: { deposit?: number; cma?: number; totalDeposit?: number; totalWithdrawal?: number }) => Promise<void>;
}

export default function SummaryStats({
    totalAssets,
    todayPnL,
    totalBuyAmount,
    cashDeposit,
    cashCma,
    totalCumulativeDeposit,
    totalCumulativeWithdrawal,
    onUpdateCash
}: SummaryStatsProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editDeposit, setEditDeposit] = useState(cashDeposit);
    const [editCma, setEditCma] = useState(cashCma);
    const [editTotalDeposit, setEditTotalDeposit] = useState(totalCumulativeDeposit);
    const [editTotalWithdrawal, setEditTotalWithdrawal] = useState(totalCumulativeWithdrawal);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setEditDeposit(cashDeposit);
        setEditCma(cashCma);
        setEditTotalDeposit(totalCumulativeDeposit);
        setEditTotalWithdrawal(totalCumulativeWithdrawal);
    }, [cashDeposit, cashCma, totalCumulativeDeposit, totalCumulativeWithdrawal]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onUpdateCash({
                deposit: editDeposit,
                cma: editCma,
                totalDeposit: editTotalDeposit,
                totalWithdrawal: editTotalWithdrawal
            });
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to save cash:", e);
        } finally {
            setLoading(false);
        }
    };

    const isPnLPositive = todayPnL >= 0;

    return (
        <Card
            size="small"
            className="glass-card overflow-hidden transition-all duration-300 hover:shadow-lg"
            styles={{
                header: { borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: 48, background: 'rgba(255,255,255,0.02)' },
                body: { padding: '28px' }
            }}
            title={
                <div className="flex justify-between items-center w-full">
                    <Space size={10} orientation="horizontal">
                        <div className="w-1.5 h-5 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                        <span className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--foreground)', opacity: 0.9 }}>핵심 포트폴리오 지표</span>
                    </Space>
                    {isEditing ? (
                        <Space size={8}>
                            <Button
                                type="primary"
                                size="small"
                                onClick={handleSave}
                                loading={loading}
                                icon={<CheckOutlined style={{ fontSize: 12 }} />}
                                style={{ borderRadius: 8, height: 28, background: '#10b981', borderColor: '#10b981' }}
                            >
                                저장
                            </Button>
                            <Button
                                size="small"
                                onClick={() => setIsEditing(false)}
                                icon={<CloseOutlined style={{ fontSize: 12 }} />}
                                style={{ borderRadius: 8, height: 28 }}
                            >
                                취소
                            </Button>
                        </Space>
                    ) : (
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined style={{ color: '#3b82f6' }} />}
                            onClick={() => setIsEditing(true)}
                            className="hover:bg-blue-500/10"
                            style={{ borderRadius: 8, height: 28, fontWeight: 700, color: '#3b82f6' }}
                        >
                            금액 수정
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-6">
                {/* Total Assets - Hero Metric */}
                <div className="relative">
                    <Row gutter={24} align="bottom">
                        <Col span={14}>
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>총 투자 평가자산 (Stock + Cash)</Text>}
                                value={totalAssets + cashDeposit + cashCma}
                                precision={0}
                                suffix={<span style={{ fontSize: 14, marginLeft: 4, fontWeight: 600, opacity: 0.5 }}>KRW</span>}
                                styles={{
                                    content: {
                                        fontSize: 38, // Slightly reduced from 42 to give more space
                                        fontWeight: 900,
                                        color: 'var(--foreground)',
                                        letterSpacing: '-2px',
                                        fontFamily: '"Inter", sans-serif'
                                    }
                                }}
                            />
                            <div className="flex gap-4 mt-1">
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    상장 주식: <Text strong style={{ color: 'var(--foreground)' }}>{totalAssets.toLocaleString()}</Text>원
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    총 현금: <Text strong style={{ color: 'var(--foreground)' }}>{(cashDeposit + cashCma).toLocaleString()}</Text>원
                                </Text>
                            </div>
                        </Col>
                        <Col span={10} className="text-right">
                            <div className={`${isPnLPositive ? 'bg-red-500/5 border-red-500/10' : 'bg-blue-500/5 border-blue-500/10'} p-4 rounded-2xl border inline-block text-left w-full`}>
                                <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, display: 'block', color: isPnLPositive ? '#ef4444' : '#3b82f6' }}>총 평가손익 (P/L)</Text>
                                <div className="flex items-baseline gap-1">
                                    {isPnLPositive ? <ArrowUpOutlined style={{ fontSize: 14, color: '#ef4444' }} /> : <ArrowDownOutlined style={{ fontSize: 14, color: '#3b82f6' }} />}
                                    <Text strong style={{ fontSize: 18, color: isPnLPositive ? '#ef4444' : '#3b82f6', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                                        {Math.round(Math.abs(todayPnL)).toLocaleString()}
                                        <small className="ml-1 text-[10px] opacity-60">원</small>
                                    </Text>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* <Divider style={{ margin: 0, opacity: 0.05 }} /> */}

                {/* Grid for other metrics */}
                <Row gutter={[24, 24]}>

                    <Col span={24}>
                        <div className="bg-slate-500/5 p-3 rounded-2xl border border-slate-500/10">
                            <div className="flex items-center justify-between gap-1">
                                {/* Deposit Part */}
                                <div className="flex-1 min-w-[110px]">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, display: 'block' }}>누적 입금</Text>
                                    {isEditing ? (
                                        <InputNumber
                                            size="small"
                                            style={{ width: '100%' }}
                                            value={editTotalDeposit}
                                            onChange={(val) => setEditTotalDeposit(val || 0)}
                                            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            className="premium-input-small"
                                        />
                                    ) : (
                                        <Text strong style={{ fontSize: 13, color: 'var(--foreground)' }}>
                                            {Math.round(totalCumulativeDeposit).toLocaleString()}<small className="ml-0.5 opacity-40 text-[9px]">원</small>
                                        </Text>
                                    )}
                                </div>

                                <div className="px-1 opacity-40">
                                    <Text style={{ fontSize: 16, fontWeight: 100 }}>-</Text>
                                </div>

                                {/* Withdrawal Part */}
                                <div className="flex-1 min-w-[110px]">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, display: 'block' }}>누적 출금</Text>
                                    {isEditing ? (
                                        <InputNumber
                                            size="small"
                                            style={{ width: '100%' }}
                                            value={editTotalWithdrawal}
                                            onChange={(val) => setEditTotalWithdrawal(val || 0)}
                                            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            className="premium-input-small"
                                        />
                                    ) : (
                                        <Text strong style={{ fontSize: 13, color: 'var(--foreground)' }}>
                                            {Math.round(totalCumulativeWithdrawal).toLocaleString()}<small className="ml-0.5 opacity-40 text-[9px]">원</small>
                                        </Text>
                                    )}
                                </div>

                                <div className="px-1 opacity-40">
                                    <Text style={{ fontSize: 16, fontWeight: 100 }}>=</Text>
                                </div>

                                {/* Net Part */}
                                <div className="flex-1 min-w-[110px] text-right">
                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, display: 'block', color: '#3b82f6' }}>순 투자 원금</Text>
                                    <Text strong style={{ fontSize: 16, color: '#3b82f6', letterSpacing: '-0.5px' }}>
                                        {Math.round(totalCumulativeDeposit - totalCumulativeWithdrawal).toLocaleString()}
                                        <small className="ml-0.5 text-[9px] opacity-60">원</small>
                                    </Text>
                                </div>
                            </div>
                        </div>
                    </Col>

                    <Col span={12}>
                        <div className="flex flex-col gap-1">
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>예수금 (Deposit)</Text>
                            {isEditing ? (
                                <InputNumber
                                    size="middle"
                                    style={{ width: '100%' }}
                                    value={editDeposit}
                                    onChange={(val) => setEditDeposit(val || 0)}
                                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    className="premium-input"
                                />
                            ) : (
                                <Text strong style={{ fontSize: 20, color: 'var(--foreground)' }}>
                                    {Math.round(cashDeposit).toLocaleString()}
                                    <small className="ml-1 opacity-40 font-normal text-xs text-secondary">원</small>
                                </Text>
                            )}
                        </div>
                    </Col>

                    <Col span={12}>
                        <div className="flex flex-col gap-1">
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>CMA / 파킹통장</Text>
                            {isEditing ? (
                                <InputNumber
                                    size="middle"
                                    style={{ width: '100%' }}
                                    value={editCma}
                                    onChange={(val) => setEditCma(val || 0)}
                                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    className="premium-input"
                                />
                            ) : (
                                <Text strong style={{ fontSize: 20, color: 'var(--foreground)' }}>
                                    {Math.round(cashCma).toLocaleString()}
                                    <small className="ml-1 opacity-40 font-normal text-xs text-secondary">원</small>
                                </Text>
                            )}
                        </div>
                    </Col>
                </Row>
            </div>
        </Card>
    );
}
