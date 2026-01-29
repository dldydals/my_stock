import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Tag, Input, Button, Badge, Empty, Modal, Form, InputNumber, Popconfirm, Popover } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, ShoppingOutlined, RiseOutlined, FallOutlined, InfoCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { useWatchlist } from '../../hooks/useWatchlist';

const { Text } = Typography;

interface WatchlistSectionProps {
    aiReport?: any;
}

export default function WatchlistSection({ aiReport }: WatchlistSectionProps) {
    const { items, loading, addToWatchlist, removeFromWatchlist, convertToHolding } = useWatchlist();
    const [searchQuery, setSearchQuery] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [buyModalVisible, setBuyModalVisible] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [form] = Form.useForm();

    const watchlistAnalysis = aiReport?.watchlist_analysis || [];

    const handleQuickBuy = (stock: any) => {
        setSelectedStock(stock);
        setBuyModalVisible(true);
        form.setFieldsValue({
            price: stock.price,
            quantity: 1,
            tradeDate: new Date().toISOString().split('T')[0]
        });
    };

    const confirmQuickBuy = async (values: any) => {
        try {
            await convertToHolding(selectedStock.ticker, values);
            setBuyModalVisible(false);
        } catch (error) {
            console.error('Failed to convert to holding:', error);
        }
    };

    const handleAdd = async () => {
        if (!searchQuery.trim()) return;

        let ticker = '';
        let name = '';

        const tickerMatch = searchQuery.match(/\d{6}/);
        if (tickerMatch) {
            ticker = tickerMatch[0];
            name = searchQuery.replace(ticker, '').replace(/[()]/g, '').trim();
        } else {
            const parts = searchQuery.split(' ');
            ticker = parts[parts.length - 1].replace(/[()]/g, '');
            name = parts.slice(0, parts.length - 1).join(' ') || ticker;
        }

        if (!name) name = ticker;
        await addToWatchlist(ticker, name);
        setSearchQuery('');
    };

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <Space>
                    <div className="w-1.5 h-5 bg-amber-500 rounded-full" />
                    <Text strong style={{ fontSize: 16 }}>Market Watchlist</Text>
                    <Badge count={items.length} style={{ backgroundColor: '#f59e0b', fontSize: 10 }} />
                </Space>

                <Space.Compact style={{ width: 300 }}>
                    <Input
                        placeholder="종목명 + 코드 (예: 삼성전자 005930)"
                        prefix={<SearchOutlined className="opacity-30" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onPressEnter={handleAdd}
                        size="small"
                        className="rounded-l-lg border-gray-200"
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        loading={addLoading}
                        size="small"
                        className="bg-amber-500 hover:bg-amber-600 border-none rounded-r-lg"
                    />
                </Space.Compact>
            </div>

            {items.length === 0 && !loading ? (
                <Card className="glass-card border-dashed border-gray-200 bg-transparent">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="관심 종목이 없습니다." />
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {items.map((item) => {
                        const isPositive = item.changeAmount > 0;
                        const isNegative = item.changeAmount < 0;
                        const absChange = Math.abs(item.changeRate);
                        const analysis = watchlistAnalysis.find((a: any) => a.name === item.name || a.ticker === item.ticker);

                        // Heatmap alpha
                        let alpha = 0.05;
                        let hasGlow = false;
                        if (absChange >= 20) { alpha = 0.25; hasGlow = true; }
                        else if (absChange >= 10) alpha = 0.20;
                        else if (absChange >= 6) alpha = 0.15;
                        else if (absChange >= 3) alpha = 0.10;

                        const bgBaseColor = isPositive ? '239, 68, 68' : '59, 130, 246';
                        const headerHeatmapStyle = item.changeAmount !== 0 ? {
                            background: `linear-gradient(135deg, rgba(${bgBaseColor}, ${alpha * 1.5}), rgba(${bgBaseColor}, ${alpha * 0.5}))`,
                            borderBottom: `1px solid rgba(${bgBaseColor}, 0.2)`,
                        } : {};

                        const isNearTarget = analysis?.target_price > 0 &&
                            Math.abs(item.price - analysis.target_price) / item.price <= 0.01;

                        return (
                            <Card
                                key={item.ticker}
                                size="small"
                                className={`glass-card overflow-hidden hover:shadow-md transition-all border-none group relative
                                    ${hasGlow ? (isPositive ? 'glow-red' : 'glow-blue') : ''}
                                    ${isNearTarget ? 'blink-animation' : ''}`}
                                styles={{ body: { padding: 0 } }}
                            >
                                {/* Header Area with Heatmap */}
                                <div className="p-3 relative z-10 flex justify-between items-start" style={headerHeatmapStyle}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <Text strong className="text-sm truncate mr-2" style={{
                                                maxWidth: '65%',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                                color: 'var(--foreground)'
                                            }}>{item.name}</Text>
                                            <Tag
                                                color={isPositive ? 'red' : isNegative ? 'blue' : 'default'}
                                                style={{ fontSize: 11, fontWeight: 800, margin: 0, border: 'none', borderRadius: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                            >
                                                {item.changeRate > 0 ? '+' : ''}{item.changeRate.toFixed(2)}%
                                            </Tag>
                                        </div>
                                        <div className="mb-1">
                                            <Text type="secondary" style={{ fontSize: 10, color: '#e2e8f0', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>{item.ticker}</Text>
                                        </div>
                                        <div>
                                            {analysis && (
                                                <Popover
                                                    content={
                                                        <div className="max-w-[280px] p-1">
                                                            <Text className="text-xs leading-relaxed text-slate-600 block mb-2">{analysis.analysis}</Text>
                                                            {analysis.target_price > 0 && <Tag color="gold" className="text-[10px]">목표가: {analysis.target_price.toLocaleString()}원</Tag>}
                                                        </div>
                                                    }
                                                    title={<Text strong className="text-xs"><MessageOutlined className="mr-1" /> AI 정밀 분석</Text>}
                                                    trigger="hover"
                                                >
                                                    <Tag color={analysis.outlook.includes('호재') ? 'error' : analysis.outlook.includes('악재') ? 'processing' : 'default'} className="rounded-full px-2 py-0 border-none cursor-help text-[10px] m-0">
                                                        {analysis.outlook}
                                                    </Tag>
                                                </Popover>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end ml-2">
                                        <Popconfirm title="관심 종목에서 삭제하시겠습니까?" onConfirm={() => removeFromWatchlist(item.ticker)} okText="네" cancelText="아니오">
                                            <Button type="text" size="small" icon={<DeleteOutlined className="text-white/40 hover:text-red-400" />} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Popconfirm>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<ShoppingOutlined />}
                                            className="bg-emerald-500 hover:bg-emerald-600 border-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] h-6"
                                            onClick={() => handleQuickBuy(item)}
                                        >
                                            매수
                                        </Button>
                                    </div>
                                </div>

                                {/* Body Area */}
                                <div className="p-3">
                                    <div className="flex items-baseline justify-between mt-1 relative z-10">
                                        <Text strong style={{ fontSize: 16, color: 'var(--foreground)', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                                            {item.price > 0 ? `${item.price.toLocaleString()}원` : '-'}
                                        </Text>
                                        {item.changeAmount !== 0 && (
                                            <Space size={4} className="bg-black/20 px-2 py-0.5 rounded-md border border-white/5">
                                                {item.changeAmount > 0 ? <RiseOutlined style={{ color: '#fca5a5', fontSize: 12 }} /> : <FallOutlined style={{ color: '#93c5fd', fontSize: 12 }} />}
                                                <Text strong style={{ fontSize: 10, color: item.changeAmount > 0 ? '#fca5a5' : '#93c5fd' }}>
                                                    {item.changeAmount > 0 ? '+' : ''}{item.changeAmount.toLocaleString()}원
                                                </Text>
                                            </Space>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    {loading && [1, 2, 3, 4].map(i => (
                        <Card key={i} size="small" loading className="glass-card border-none" />
                    ))}
                </div>
            )}

            <div className="mt-3 flex items-center gap-2 px-2 opacity-40">
                <InfoCircleOutlined style={{ fontSize: 11 }} />
                <Text style={{ fontSize: 11 }}>삼성전자 005930 등 종목명과 코드를 함께 입력하여 추가하세요.</Text>
            </div>

            <Modal
                title={`${selectedStock?.name} (${selectedStock?.ticker}) 매수`}
                open={buyModalVisible}
                onOk={() => form.submit()}
                onCancel={() => setBuyModalVisible(false)}
                okText="보유 종목으로 승격"
                cancelText="취소"
                centered
            >
                <Form form={form} layout="vertical" onFinish={confirmQuickBuy} initialValues={{ fee: 0 }}>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="quantity" label="수량" rules={[{ required: true }]}>
                            <InputNumber className="w-full" placeholder="10" />
                        </Form.Item>
                        <Form.Item name="price" label="매수가" rules={[{ required: true }]}>
                            <InputNumber className="w-full" placeholder="50000" />
                        </Form.Item>
                    </div>
                    <Form.Item name="tradeDate" label="매수일" rules={[{ required: true }]}>
                        <Input type="date" />
                    </Form.Item>
                    <Text type="secondary" className="text-[10px]">
                        * 매수 완료 시 관심 종목에서 보유 종목 섹션으로 이동합니다.
                    </Text>
                </Form>
            </Modal>
        </div>
    );
}
