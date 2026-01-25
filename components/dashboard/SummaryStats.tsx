'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tooltip, Typography, Space, Divider, Button, InputNumber } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SummaryStatsProps {
    totalAssets: number;
    todayPnL: number;
    expectedDividends: number;
    cashDeposit: number;
    cashCma: number;
    onUpdateCash: (data: { deposit: number; cma: number }) => Promise<void>;
}

export default function SummaryStats({ totalAssets, todayPnL, expectedDividends, cashDeposit, cashCma, onUpdateCash }: SummaryStatsProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editDeposit, setEditDeposit] = useState(cashDeposit);
    const [editCma, setEditCma] = useState(cashCma);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setEditDeposit(cashDeposit);
        setEditCma(cashCma);
    }, [cashDeposit, cashCma]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onUpdateCash({ deposit: editDeposit, cma: editCma });
            // Immediately close editing mode after a successful call
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
            className="mb-6 glass-card overflow-hidden transition-all duration-300 hover:shadow-lg"
            styles={{
                header: { borderBottom: '1px solid rgba(0,0,0,0.05)', minHeight: 40 },
                body: { padding: '24px' }
            }}
            title={
                <Space size={8} direction="horizontal">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-sm font-bold opacity-80" style={{ color: 'var(--foreground)' }}>핵심 지표 (Key Metrics)</span>
                </Space>
            }
        >
            <div>
                <Row gutter={[24, 24]}>
                    <Col span={24}>
                        <Statistic
                            title={<Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>총 투자 평가자산 (예수금 포함)</Text>}
                            value={totalAssets + cashDeposit}
                            precision={0}
                            suffix={<span style={{ fontSize: 16, marginLeft: 4, fontWeight: 500 }}>원</span>}
                            styles={{ content: { fontSize: 36, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-1.5px', fontFamily: '"JetBrains Mono", monospace' } }}
                        />
                    </Col>

                    <Col xs={12} sm={8}>
                        <Statistic
                            title={
                                <Space size={4} direction="horizontal">
                                    <Text type="secondary" style={{ fontSize: 12 }}>총 평가손익</Text>
                                    <Tooltip title="보유 종목의 총 합계 수익">
                                        <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
                                    </Tooltip>
                                </Space>
                            }
                            value={Math.abs(todayPnL)}
                            precision={0}
                            styles={{
                                content: {
                                    color: isPnLPositive ? '#ef4444' : '#3b82f6',
                                    fontSize: 20,
                                    fontWeight: 800,
                                    fontFamily: '"JetBrains Mono", monospace'
                                }
                            }}
                            prefix={isPnLPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        />
                    </Col>

                    {expectedDividends > 0 && (
                        <Col xs={12} sm={8}>
                            <Statistic
                                title={
                                    <Space size={4} direction="horizontal">
                                        <Text type="secondary" style={{ fontSize: 12 }}>예상 배당금 (연)</Text>
                                        <Tooltip title="보유 종목의 시가 배당률(KRX 기준)을 반영한 세전 예상 수령액입니다.">
                                            <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
                                        </Tooltip>
                                    </Space>
                                }
                                value={expectedDividends}
                                precision={0}
                                styles={{ content: { fontSize: 20, fontWeight: 800, color: 'var(--foreground)', opacity: 0.8, fontFamily: '"JetBrains Mono", monospace' } }}
                            />
                        </Col>
                    )}
                </Row>

                <Divider style={{ margin: '16px 0', opacity: 0.1 }} />

                <div className="relative">
                    <Row gutter={16} align="middle">
                        <Col span={10}>
                            <div className="flex flex-col">
                                <Text type="secondary" style={{ fontSize: 11, marginBottom: 2 }}>예수금</Text>
                                {isEditing ? (
                                    <InputNumber
                                        size="small"
                                        style={{ width: '100%' }}
                                        value={editDeposit}
                                        onChange={(val) => setEditDeposit(val || 0)}
                                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    />
                                ) : (
                                    <Text className="font-numeric" strong style={{ fontSize: 16, color: 'var(--foreground)' }}>{cashDeposit.toLocaleString()}<small className="ml-1 font-normal opacity-50 text-[10px]">원</small></Text>
                                )}
                            </div>
                        </Col>
                        <Col span={10}>
                            <div className="flex flex-col">
                                <Text type="secondary" style={{ fontSize: 11, marginBottom: 2 }}>CMA</Text>
                                {isEditing ? (
                                    <InputNumber
                                        size="small"
                                        className="font-numeric"
                                        style={{ width: '100%' }}
                                        value={editCma}
                                        onChange={(val) => setEditCma(val || 0)}
                                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    />
                                ) : (
                                    <Text className="font-numeric" strong style={{ fontSize: 16, color: 'var(--foreground)' }}>{cashCma.toLocaleString()}<small className="ml-1 font-normal opacity-50 text-[10px]">원</small></Text>
                                )}
                            </div>
                        </Col>
                        <Col span={4} className="flex justify-end">
                            {isEditing ? (
                                <Space size={4} direction="horizontal">
                                    <Button
                                        type="primary"
                                        size="small"
                                        icon={<CheckOutlined style={{ fontSize: 10 }} />}
                                        onClick={handleSave}
                                        loading={loading}
                                        style={{ borderRadius: 4, width: 24, padding: 0 }}
                                    />
                                    <Button
                                        size="small"
                                        icon={<CloseOutlined style={{ fontSize: 10 }} />}
                                        onClick={() => setIsEditing(false)}
                                        style={{ borderRadius: 4, width: 24, padding: 0 }}
                                    />
                                </Space>
                            ) : (
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined style={{ color: '#3b82f6' }} />}
                                    onClick={() => setIsEditing(true)}
                                    className="hover:bg-blue-500/10"
                                    style={{ borderRadius: 6, fontWeight: 700 }}
                                >
                                    <span style={{ fontSize: 12, color: '#3b82f6' }}>수정</span>
                                </Button>
                            )}
                        </Col>
                    </Row>
                </div>
            </div>
        </Card>
    );
}
