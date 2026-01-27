'use client';

import React from 'react';
import { Card, Typography, Row, Col, Progress, Tag, Space, Alert } from 'antd';
import { AlertOutlined, SafetyCertificateOutlined, LineChartOutlined, DollarOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Stock {
    name: string;
    ticker: string;
    currentAmount: number;
    yield: number;
}

interface PortfolioInsightsProps {
    holdings: Stock[];
    cashTotal: number;
}

export default function PortfolioInsights({ holdings, cashTotal }: PortfolioInsightsProps) {
    const totalInvested = holdings.reduce((sum, s) => sum + s.currentAmount, 0);
    const totalPortfolio = totalInvested + cashTotal;

    // 1. Concentration Risk Analysis
    const concentrations = holdings.map(s => ({
        name: s.name,
        ratio: (s.currentAmount / totalPortfolio) * 100
    })).sort((a, b) => b.ratio - a.ratio);

    const highConcentration = concentrations.find(c => c.ratio > 30);

    // 2. Diversification Score (Basic logic: 100 - (Max Ratio * 1.5))
    const diversificationScore = Math.max(0, Math.min(100, Math.floor(100 - (concentrations[0]?.ratio || 0) * 1.2)));

    // 3. Overall Stance
    const totalYield = holdings.length > 0
        ? holdings.reduce((sum, s) => sum + (s.yield * (s.currentAmount / totalInvested)), 0)
        : 0;

    const cashRatio = (cashTotal / totalPortfolio) * 100;

    return (
        <Card
            className="glass-card overflow-hidden transition-all duration-300 hover:shadow-lg"
            styles={{
                header: { borderBottom: '1px solid rgba(0, 0, 0, 0.05)', minHeight: 40 },
                body: { padding: '24px' }
            }}
            title={
                <Space size={8} orientation="horizontal">
                    <div className="w-1.5 h-4 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                    <span className="text-sm font-bold opacity-80" style={{ color: 'var(--foreground)' }}>포트폴리오 정밀 분석</span>
                </Space>
            }
        >
            <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                    <div className="bg-transparent dark:bg-white/5 p-4 rounded-xl h-full border border-slate-100 dark:border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <Text strong style={{ fontSize: 13, color: 'var(--foreground)' }}><SafetyCertificateOutlined className="mr-1" /> 분산 투자 점수</Text>
                            <Text className="font-numeric" strong style={{ color: diversificationScore > 70 ? '#22c55e' : '#f59e0b' }}>{diversificationScore}점</Text>
                        </div>
                        <Progress
                            percent={diversificationScore}
                            strokeColor={{ '0%': '#3b82f6', '100%': diversificationScore > 70 ? '#22c55e' : '#f59e0b' }}
                            showInfo={false}
                            size="small"
                        />
                        <div className="mt-3">
                            <Text type="secondary" style={{ fontSize: 11, opacity: 0.8 }}>
                                {diversificationScore > 80 ? "매우 안정적인 포트폴리오 구성을 유지하고 있습니다." :
                                    diversificationScore > 50 ? "적절한 분산이 이루어지고 있으나 특정 종목 비중을 주시하세요." :
                                        "집중 투자 경향이 강합니다. 리스크 관리가 필요할 수 있습니다."}
                            </Text>
                        </div>
                    </div>
                </Col>

                <Col xs={24} md={12}>
                    <div className="bg-transparent dark:bg-slate-10/40 p-4 rounded-xl h-full border border-slate-100 dark:border-slate-300">
                        <div className="flex justify-between items-center mb-3">
                            <Text strong style={{ fontSize: 13, color: 'var(--foreground)' }}><DollarOutlined className="mr-1" /> 현금 비중 리포트</Text>
                            <Tag color={cashRatio > 20 ? 'blue' : 'orange'} style={{ borderRadius: 4, margin: 0 }}>{cashRatio.toFixed(1)}%</Tag>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Text type="secondary" style={{ fontSize: 11, opacity: 0.8 }}>
                                {cashRatio > 25 ? "현금 비중이 높습니다. 하락장 대응 여력이 충분합니다." :
                                    cashRatio > 10 ? "안정적인 현금 비중을 유지하고 있습니다." :
                                        "현금 비중이 낮아 추매 대응이 어려울 수 있습니다."}
                            </Text>
                            <div className="mt-2 text-[10px] bg-transparent p-2 rounded border border-slate-100/60 dark:bg-gray-100/20 dark:border-slate-300">
                                <Text type="secondary" style={{ opacity: 1.0 }}>가이드: 시장 변동성 대비 권장 현금 비중은 15~20% 내외입니다.</Text>
                            </div>
                        </div>
                    </div>
                </Col>

                {highConcentration && (
                    <Col span={24}>
                        <Alert
                            title={<Text strong style={{ fontSize: 13, color: '#856404' }}>비중 과다 경고: {highConcentration.name}</Text>}
                            description={<Text style={{ fontSize: 11, color: '#856404' }}>해당 종목이 전체 자산의 {highConcentration.ratio.toFixed(1)}%를 차지하고 있습니다. 한 종목의 리스크가 전체 포트폴리오에 큰 영향을 줄 수 있으니 주의가 필요합니다.</Text>}
                            type="warning"
                            showIcon
                            icon={<AlertOutlined />}
                            style={{ borderRadius: 12 }}
                        />
                    </Col>
                )}

                <Col span={24}>
                    <div className="p-2 border-t border-slate-200/40 dark:border-slate-800">
                        <Text strong style={{ fontSize: 13, color: 'var(--foreground)' }} className="block mb-2">실시간 투자 인사이트</Text>
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"></div>
                                <Text style={{ fontSize: 12, color: 'var(--foreground)', opacity: 0.9 }}>현재 전체 가중 수익률은 <Text strong style={{ color: totalYield >= 0 ? '#ef4444' : '#3b82f6' }}>{totalYield.toFixed(2)}%</Text> 입니다.</Text>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></div>
                                <Text style={{ fontSize: 12, color: 'var(--foreground)', opacity: 0.9 }}>시가총액 상위 <Text strong style={{ color: 'var(--foreground)' }}>{holdings.length}개</Text> 종목에 분산 투자 중입니다.</Text>
                            </div>
                        </Space>
                    </div>
                </Col>
            </Row>
        </Card>
    );
}
