'use client';

import React from 'react';
import { Card, Space, Typography, Button, Tag, Table, Divider, Badge, Popover, Empty } from 'antd';
const { Text } = Typography;
import {
    RobotOutlined,
    ThunderboltOutlined,
    RiseOutlined,
    FallOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
    MessageOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StockAnalysis {
    name: string;
    outlook: string;
    analysis: string;
    buy_price: number;
    target_price: number;
    stop_loss: number;
}

interface AIReportData {
    market_summary: string;
    daily_advice: string;
    holdings_analysis?: StockAnalysis[];
    watchlist_analysis?: StockAnalysis[];
    stocks?: StockAnalysis[]; // Backward compatibility
    date?: string;
}

interface AIReportCardProps {
    data: AIReportData | null;
    loading: boolean;
    onRefresh: () => void;
}

export default function AIReportCard({ data, loading, onRefresh }: AIReportCardProps) {
    if (!data && !loading) {
        return (
            <Card className="glass-card mb-6 overflow-hidden shadow-sm">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="AI 리포트가 없습니다."
                >
                    <Button type="primary" onClick={onRefresh} shape="round">분석 생성하기</Button>
                </Empty>
            </Card>
        );
    }

    const columns = [
        {
            title: '종목',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong className="text-slate-800 dark:text-slate-200">{text}</Text>,
        },
        {
            title: '전망',
            dataIndex: 'outlook',
            key: 'outlook',
            width: 80,
            render: (text: string, record: StockAnalysis) => {
                let color = 'default';
                if (text.includes('호재')) color = 'error';
                if (text.includes('악재')) color = 'processing';

                return (
                    <Popover
                        content={
                            <div className="max-w-[300px] p-2">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                    <MessageOutlined className="text-indigo-500" />
                                    <Text strong className="text-indigo-600">{record.name} 정밀 분석</Text>
                                </div>
                                <Text className="text-xs leading-relaxed text-slate-600">
                                    {record.analysis}
                                </Text>
                            </div>
                        }
                        title={null}
                        trigger={["hover", "click"]}
                        placement="topRight"
                        overlayClassName="premium-popover"
                    >
                        <Tag color={color} className="rounded-full px-3 cursor-help hover:scale-105 transition-transform">
                            {text}
                        </Tag>
                    </Popover>
                );
            },
        },
        {
            title: '매수추천',
            dataIndex: 'buy_price',
            key: 'buy_price',
            render: (val: number) => val > 0 ? `${val.toLocaleString()}원` : '-',
        },
        {
            title: '목표가',
            dataIndex: 'target_price',
            key: 'target_price',
            render: (val: number) => val > 0 ? <Text strong style={{ color: '#ef4444' }}>{val.toLocaleString()}원</Text> : '-',
        },
    ];

    const holdings = data?.holdings_analysis || data?.stocks || [];
    const watchlist = data?.watchlist_analysis || [];

    return (
        <div className="space-y-6">
            {/* Header / Context Card */}
            <Card
                loading={loading}
                className="glass-card overflow-hidden shadow-sm"
                styles={{
                    header: { borderBottom: '1px solid rgba(0, 0, 0, 0.05)', minHeight: 56, background: 'rgba(255, 255, 255, 0.02)' },
                    body: { padding: '24px' }
                }}
                title={
                    <Space size={12} className="w-full justify-between">
                        <Space>
                            <div className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            <Text strong style={{ fontSize: 18, letterSpacing: '-0.02em' }}>
                                <RobotOutlined className="mr-2 text-indigo-500" />
                                AI Daily Intelligence
                            </Text>
                            {data?.date && <Tag color="blue" className="ml-2 border-0">{data.date}</Tag>}
                            {(() => {
                                const isToday = data?.date === new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
                                if (!isToday && data?.date) {
                                    // Fallback check if data.date is formatted differently or just Date string
                                    const reportDate = new Date(data.date).toDateString();
                                    const todayDate = new Date().toDateString();
                                    if (reportDate !== todayDate) return null;
                                }
                                return (
                                    <Tag
                                        color="success"
                                        icon={<CheckCircleOutlined />}
                                        className="ml-2 border-0 animate-bounce-subtle"
                                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontWeight: 800 }}
                                    >
                                        오늘의 분석 완료
                                    </Tag>
                                );
                            })()}
                        </Space>
                        <Button
                            type="text"
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={onRefresh}
                            className="opacity-40 hover:opacity-100 transition-opacity"
                        >
                            새로고침
                        </Button>
                    </Space>
                }
            >
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Badge status="processing" color="#6366f1" />
                        <Text strong className="text-sm text-slate-500 uppercase tracking-wider">Market Context</Text>
                    </div>
                    <div className="bg-slate-500/5 p-5 rounded-2xl border border-slate-500/10 mb-5 leading-relaxed dark:text-slate-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {data?.market_summary || ''}
                        </ReactMarkdown>
                    </div>

                    {data?.daily_advice && (
                        <div className="flex items-start gap-4 p-4 bg-indigo-500/[0.03] rounded-2xl border border-indigo-500/10 shadow-sm">
                            <ThunderboltOutlined className="text-xl text-indigo-500 mt-1" />
                            <div>
                                <Text strong style={{ fontSize: 13, display: 'block', color: '#6366f1', marginBottom: 2 }}>CORE STRATEGY</Text>
                                <Text className="text-sm opacity-90 leading-normal">{data.daily_advice}</Text>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* 1. Portfolio Analysis Card */}
            {holdings.length > 0 && !loading && (
                <Card
                    className="glass-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700"
                    title={
                        <Space>
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                <RiseOutlined className="text-emerald-500" />
                            </div>
                            <Text strong>보유 종목 관리 가이드 (Portfolio)</Text>
                        </Space>
                    }
                >
                    <Table
                        dataSource={holdings}
                        columns={columns}
                        pagination={false}
                        size="small"
                        className="premium-table"
                        rowKey="name"
                    />
                </Card>
            )}

            {/* 2. Watchlist Analysis Card */}
            {watchlist.length > 0 && !loading && (
                <Card
                    className="glass-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150"
                    title={
                        <Space>
                            <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                <InfoCircleOutlined className="text-amber-500" />
                            </div>
                            <Text strong>관심 종목 진입 전략 (Watchlist)</Text>
                        </Space>
                    }
                >
                    <Table
                        dataSource={watchlist}
                        columns={columns}
                        pagination={false}
                        size="small"
                        className="premium-table"
                        rowKey="name"
                    />
                </Card>
            )}

            <div className="mt-4 flex items-start gap-3 p-3 bg-gray-500/[0.02] rounded-xl border border-dashed border-gray-500/20 px-4">
                <InfoCircleOutlined className="opacity-30 mt-1" style={{ fontSize: 12 }} />
                <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                    위 분석은 Gemini AI가 실시간 시장 데이터 및 뉴스를 결합하여 생성한 전문 리포트입니다. **전망(호재/악재)** 태그에 마우스를 올리면 상세 분석을 볼 수 있습니다.
                </Text>
            </div>
        </div>
    );
}
