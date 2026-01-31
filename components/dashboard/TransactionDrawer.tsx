import React, { useState, useEffect } from 'react';
// [수정 1] message를 제거하고 App을 추가했습니다.
import { Drawer, Table, Tag, Typography, Button, Modal, Form, InputNumber, DatePicker, App, Row, Col, Space, Tooltip, Divider } from 'antd';
import { InfoCircleOutlined, TransactionOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface Transaction {
    id: number;
    ticker: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    remainingQuantity: number;
    price: number;
    fee: number;
    realizedProfit?: number;
    parentTransactionId?: number;
    tradeDate: string;
}

interface TransactionDrawerProps {
    open: boolean;
    onClose: () => void;
    ticker: string;
    stockName: string;
    transactions: Transaction[];
    currentPrice: number;
    changeRate: number;
    onTransactionSuccess: () => void;
}

export default function TransactionDrawer({ open, onClose, ticker, stockName, transactions, currentPrice, changeRate, onTransactionSuccess }: TransactionDrawerProps) {
    // [수정 2] App.useApp() 훅을 사용하여 Context에 연결된 message 객체를 가져옵니다.
    const { message } = App.useApp();
    
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [buyModalOpen, setBuyModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [sellForm] = Form.useForm();
    const [buyForm] = Form.useForm();

    const watchSellQuantity = Form.useWatch('quantity', sellForm);
    const watchSellPrice = Form.useWatch('price', sellForm);
    const watchBuyQuantity = Form.useWatch('quantity', buyForm);
    const watchBuyPrice = Form.useWatch('price', buyForm);

    const calculateSellFees = (qty: number, prc: number) => {
        const amount = qty * prc;
        const brokerageFee = amount * 0.00015;
        const transactionTax = amount * 0.0018;
        return Math.floor(brokerageFee + transactionTax);
    };

    const calculateBuyFees = (qty: number, prc: number) => {
        const amount = qty * prc;
        const brokerageFee = amount * 0.00015;
        return Math.floor(brokerageFee);
    };

    const handleSellClick = (record: Transaction) => {
        setSelectedTx(record);
        sellForm.setFieldsValue({
            quantity: record.remainingQuantity,
            price: currentPrice,
            fee: calculateSellFees(record.remainingQuantity, currentPrice),
            tradeDate: dayjs(),
        });
        setSellModalOpen(true);
    };

    const handleBuyClick = () => {
        buyForm.setFieldsValue({
            quantity: 1,
            price: currentPrice,
            fee: calculateBuyFees(1, currentPrice),
            tradeDate: dayjs(),
        });
        setBuyModalOpen(true);
    };

    useEffect(() => {
        if (sellModalOpen && watchSellQuantity && watchSellPrice) {
            const newFee = calculateSellFees(watchSellQuantity, watchSellPrice);
            if (sellForm.getFieldValue('fee') !== newFee) {
                sellForm.setFieldValue('fee', newFee);
            }
        }
    }, [watchSellQuantity, watchSellPrice, sellModalOpen, sellForm]);

    useEffect(() => {
        if (buyModalOpen && watchBuyQuantity && watchBuyPrice) {
            const newFee = calculateBuyFees(watchBuyQuantity, watchBuyPrice);
            if (buyForm.getFieldValue('fee') !== newFee) {
                buyForm.setFieldValue('fee', newFee);
            }
        }
    }, [watchBuyQuantity, watchBuyPrice, buyModalOpen, buyForm]);

    const handleSellSubmit = async () => {
        if (!selectedTx) return;
        try {
            const values = await sellForm.validateFields();
            if (values.quantity > selectedTx.remainingQuantity) {
                // 이제 이 message는 테마가 적용된 Context API 기반 메시지입니다.
                message.error('매도 수량이 보유한 수량을 초과할 수 없습니다.');
                return;
            }

            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    name: stockName,
                    type: 'SELL',
                    quantity: values.quantity,
                    price: values.price,
                    fee: values.fee,
                    tradeDate: values.tradeDate.toISOString(),
                    parentTransactionId: selectedTx.id,
                }),
            });

            if (res.ok) {
                message.success('매도 처리가 완료되었습니다.');
                setSellModalOpen(false);
                onTransactionSuccess();
            } else {
                message.error('매도 처리 중 오류가 발생했습니다.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleBuySubmit = async () => {
        try {
            const values = await buyForm.validateFields();

            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    name: stockName,
                    type: 'BUY',
                    quantity: values.quantity,
                    price: values.price,
                    fee: values.fee,
                    tradeDate: values.tradeDate.toISOString(),
                }),
            });

            if (res.ok) {
                message.success('매수 등록이 완료되었습니다.');
                setBuyModalOpen(false);
                onTransactionSuccess();
            } else {
                message.error('매수 등록 중 오류가 발생했습니다.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Data Splitting with robust verification
    const safeTx = Array.isArray(transactions) ? transactions : [];

    // Normalizing data to handle potential casing differences from API
    const normalizedTx = safeTx.map(t => {
        const item = t as any;
        return {
            ...t,
            remainingQuantity: t.remainingQuantity ?? item.remaining_quantity ?? 0,
            realizedProfit: t.realizedProfit ?? item.realized_profit ?? 0,
            tradeDate: t.tradeDate ?? item.trade_date
        } as Transaction;
    });

    const activeLots = normalizedTx.filter(t => {
        const type = String(t.type).toUpperCase();
        const remQty = Number(t.remainingQuantity);
        return type === 'BUY' && remQty > 0;
    });

    const realizedHistory = normalizedTx.filter(t => String(t.type).toUpperCase() === 'SELL');

    const totalActiveCost = activeLots.reduce((sum, t) => {
        const remQty = Number(t.remainingQuantity);
        const buyPrice = Number(t.price);
        const buyFeeProRata = (remQty / Number(t.quantity)) * Number(t.fee);
        return sum + (remQty * buyPrice + buyFeeProRata);
    }, 0);

    const lifetimeRealizedProfit = realizedHistory.reduce((sum, t) => sum + Number(t.realizedProfit || 0), 0);

    // Total Net PnL (After pro-rata buy fees and estimated sell fees)
    const totalProcessedPnL = activeLots.reduce((sum, t) => {
        const remQty = Number(t.remainingQuantity);
        const buyPrice = Number(t.price);
        const buyFeeProRata = (remQty / Number(t.quantity)) * Number(t.fee);

        const currentVal = currentPrice * remQty;
        const estSellFee = calculateSellFees(remQty, currentPrice);

        return sum + (currentVal - (remQty * buyPrice) - buyFeeProRata - estSellFee);
    }, 0);

    const totalYield = totalActiveCost > 0 ? (totalProcessedPnL / totalActiveCost * 100) : 0;
    const isPositive = totalProcessedPnL >= 0;

    // Price change calculations
    const prevClose = currentPrice / (1 + (changeRate / 100));
    const priceDiff = currentPrice - prevClose;
    const isPriceUp = changeRate >= 0;

    const lotColumns: ColumnsType<Transaction> = [
        {
            title: '매입일자',
            dataIndex: 'tradeDate',
            key: 'tradeDate',
            width: 85,
            render: (date) => <Text className="font-numeric" style={{ fontSize: 11, color: '#64748b' }}>{dayjs(date).format('YY-MM-DD')}</Text>,
        },
        {
            title: '잔여 수량',
            key: 'qty',
            width: 70,
            render: (_: any, record: Transaction) => {
                const remQty = record.remainingQuantity ?? (record as any).remaining_quantity ?? 0;
                return (
                    <div className="flex flex-col">
                        <Text className="font-numeric text-slate-900 dark:text-slate-100" style={{ fontSize: 13, fontWeight: 700 }}>
                            {Number(remQty).toLocaleString()}
                            <small className="ml-0.5 opacity-50 font-normal">주</small>
                        </Text>
                        <Text className="font-numeric" style={{ fontSize: 9, color: '#94a3b8' }}>/ {Number(record.quantity).toLocaleString()}주</Text>
                    </div>
                );
            },
        } as any,
        {
            title: '매입/평가금액',
            key: 'amounts',
            align: 'right',
            width: 80,
            render: (_: any, record: Transaction) => {
                const remQty = record.remainingQuantity ?? (record as any).remaining_quantity ?? 0;
                const buyValue = (remQty * record.price) + (remQty / record.quantity * record.fee);
                const evalValue = remQty * currentPrice;
                return (
                    <div className="flex flex-col items-end">
                        <Text className="font-numeric text-slate-900 dark:text-slate-100" style={{ fontSize: 13, fontWeight: 700 }}>{Math.round(evalValue).toLocaleString()}원</Text>
                        <Text className="font-numeric" style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'none' }}>{Math.round(buyValue).toLocaleString()}원</Text>
                    </div>
                );
            }
        } as any,
        {
            title: '매입단가',
            dataIndex: 'price',
            key: 'price',
            align: 'right',
            width: 100,
            render: (val: number) => <Text className="font-numeric text-slate-900 dark:text-slate-100" style={{ fontSize: 12, fontWeight: 500 }}>{Number(val).toLocaleString()}</Text>,
        } as any,
        {
            title: '평가손익 (세후)',
            key: 'pnl',
            align: 'right',
            width: 120,
            render: (_: any, record: Transaction) => {
                const remQty = record.remainingQuantity ?? (record as any).remaining_quantity ?? 0;
                const totalQty = Number(record.quantity);
                const buyFee = Number(record.fee);
                const buyPrice = Number(record.price);

                const currentValue = currentPrice * remQty;
                const buyValueProRata = (remQty * buyPrice) + (remQty / totalQty) * buyFee;
                const estSellFee = calculateSellFees(remQty, currentPrice);

                const pnl = currentValue - buyValueProRata - estSellFee;
                const yieldVal = buyValueProRata > 0 ? (pnl / buyValueProRata) * 100 : 0;
                const isProfit = pnl >= 0;

                return (
                    <div className="flex flex-col items-end">
                        <Tooltip title={
                            <div className="text-[10px]">
                                <div>평가액: {Math.round(currentValue).toLocaleString()}원</div>
                                <div>매입원가: {Math.round(remQty * buyPrice).toLocaleString()}원</div>
                                <div>매입수수료(안분): {Math.round((remQty / totalQty) * buyFee).toLocaleString()}원</div>
                                <div className="text-blue-300">매도비용(예상): -{estSellFee.toLocaleString()}원</div>
                                <Divider style={{ margin: '4px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
                                <div className="font-bold">순이익: {Math.round(pnl).toLocaleString()}원</div>
                            </div>
                        }>
                            <Text className="font-numeric" style={{ fontSize: 13, color: isProfit ? '#ef4444' : '#3b82f6', fontWeight: 900, cursor: 'help' }}>
                                {isProfit ? '+' : ''}{Math.round(pnl).toLocaleString()}
                            </Text>
                        </Tooltip>
                        <Text className="font-numeric" style={{ fontSize: 10, color: isProfit ? '#ef4444' : '#3b82f6', fontWeight: 600 }}>
                            {isProfit ? '+' : ''}{yieldVal.toFixed(2)}%
                        </Text>
                    </div>
                );
            },
        } as any,
        {
            title: '매도',
            key: 'action',
            width: 65,
            align: 'center',
            render: (_: any, record: Transaction) => (
                <Button
                    size="small"
                    type="primary"
                    danger
                    ghost
                    onClick={() => handleSellClick(record)}
                    style={{ fontSize: 11, borderRadius: 6, height: 24, padding: '0 10px', fontWeight: 700 }}
                >
                    매도
                </Button>
            ),
        } as any,
    ];

    const historyColumns: ColumnsType<Transaction> = [
        {
            title: '매도일자',
            dataIndex: 'tradeDate',
            key: 'tradeDate',
            width: 90,
            render: (date) => <Text className="font-numeric" style={{ fontSize: 11, color: '#64748b' }}>{dayjs(date).format('YY-MM-DD')}</Text>,
        },
        {
            title: '매도수량',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 80,
            render: (val: number) => <Text className="font-numeric" style={{ fontSize: 12, fontWeight: 700 }}>{Number(val).toLocaleString()}<small className="ml-0.5 opacity-50 font-normal">주</small></Text>,
        },
        {
            title: '매도단가',
            dataIndex: 'price',
            key: 'price',
            align: 'right',
            width: 100,
            render: (val: number) => <Text className="font-numeric" style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{Number(val).toLocaleString()}</Text>,
        } as any,
        {
            title: '확정 순이익',
            dataIndex: 'realizedProfit',
            key: 'realizedProfit',
            align: 'right',
            render: (val: number) => {
                const profit = Number(val || 0);
                const isProfit = profit >= 0;
                return (
                    <Text className="font-numeric" style={{ fontSize: 12, color: isProfit ? '#ef4444' : '#3b82f6', fontWeight: 800 }}>
                        {isProfit ? '+' : ''}{Math.round(profit).toLocaleString()}원
                    </Text>
                );
            },
        } as any,
    ];

    return (
        <Drawer
            title={
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-6 rounded-full ${isPositive ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]'}`} />
                        <Title level={4} style={{ margin: 0, letterSpacing: '-0.5px', color: 'var(--foreground)' }}>{stockName} 거래 현황</Title>
                        <Tag color={isPriceUp ? 'red' : 'blue'} variant="solid" style={{ marginLeft: 'auto', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
                            REAL-TIME LIVE
                        </Tag>
                    </div>
                </div>
            }
            placement="right"
            onClose={onClose}
            open={open}
            size={780}
            styles={{
                body: { padding: '24px', overflowX: 'hidden', background: 'var(--background)', filter: 'brightness(0.9)' },
                header: { padding: '20px 24px', background: 'var(--background)', borderBottom: '1px solid var(--glass-border)', filter: 'brightness(0.9)' }
            }}

        >
            {/* Header Summary Card */}
            <style jsx global>{`
                .pastel-table .ant-table-thead > tr > th {
                    background-color: var(--background) !important;
                    color: var(--foreground) !important;
                    opacity: 0.7;
                    font-weight: 700 !important;
                    font-size: 11px !important;
                    border-bottom: 1px solid var(--glass-border) !important;
                }
                .pastel-table .ant-table-tbody > tr:hover > td {
                    background-color: rgba(59, 130, 246, 0.05) !important;
                }
                .pastel-table .ant-table-cell {
                    border-bottom: 1px solid var(--glass-border) !important;
                    color: var(--foreground) !important;
                }
                .dark .pastel-table .ant-table-tbody > tr:hover > td {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                }
            `}</style>

            <div className="p-6 rounded-[12px] mb-8 border border-slate-200/60 dark:border-green-800 bg-slate-50/50 dark:bg-white/5 relative overflow-hidden">
                <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-[0.05] blur-3xl ${isPositive ? 'bg-red-500' : 'bg-blue-500'}`} />
                <Row gutter={24} align="middle">
                    <Col span={8}>
                        <Text style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground)', opacity: 0.8, display: 'block', marginBottom: 4 }}>현재가 (전일대비)</Text>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5">
                                <Text className="font-numeric" style={{ fontSize: 36, fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                                    {currentPrice.toLocaleString()}
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', opacity: 0.6 }}>원</Text>
                            </div>
                            <div className="flex items-center gap-2 mt-2 bg-slate-50 dark:bg-white/10 w-fit px-2 py-0.5 rounded-md border border-slate-100 dark:border-white/20">
                                <Text className="font-numeric" style={{ fontSize: 14, fontWeight: 800, color: isPriceUp ? '#ef4444' : '#3b82f6' }}>
                                    {isPriceUp ? '▲' : '▼'}{Math.abs(Math.round(priceDiff)).toLocaleString()}
                                </Text>
                                <Text className="font-numeric" style={{ fontSize: 14, fontWeight: 800, color: isPriceUp ? '#ef4444' : '#3b82f6' }}>
                                    ({changeRate > 0 ? '+' : ''}{changeRate.toFixed(2)}%)
                                </Text>
                            </div>
                        </div>
                    </Col>
                    <Col span={16}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col border-l-2 border-slate-100 dark:border-green-800 pl-4">
                                <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>총 미실현 순이익 (수익률)</Text>
                                <Text className="font-numeric" style={{ fontSize: 18, fontWeight: 900, color: isPositive ? '#ef4444' : '#3b82f6' }}>
                                    {isPositive ? '+' : ''}{Math.round(totalProcessedPnL).toLocaleString()}
                                    <small className="ml-1 text-[12px]">원 ({isPositive ? '+' : ''}{totalYield.toFixed(2)}%)</small>
                                </Text>
                                <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>* 제비용(매수/도) 및 세금 차감 후 실질 수익</Text>
                            </div>
                            <div className="flex flex-col border-l-2 border-slate-100 dark:border-green-800 pl-4">
                                <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>누적 실현된 순이익</Text>
                                <Text className="font-numeric" style={{ fontSize: 18, fontWeight: 900, color: 'var(--foreground)' }}>
                                    {lifetimeRealizedProfit >= 0 ? '+' : ''}{Math.round(lifetimeRealizedProfit).toLocaleString()}원
                                </Text>
                                <Text style={{ fontSize: 9, color: 'var(--foreground)', opacity: 0.5, marginTop: 2 }}>* 매도 시 확정된 금액</Text>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Section 1: Active Lots */}
            <div className="mb-4 flex justify-between items-center px-2">
                <Text strong style={{ fontSize: 15, color: '#a7b5ccff' }}>보유 중인 매수건 <Tag color="orange" style={{ marginLeft: 6, fontSize: 10, borderRadius: 4 }}>{activeLots.length}건</Tag></Text>
                <div className="flex items-center gap-2">
                    <Button
                        type="primary"
                        size="small"
                        onClick={handleBuyClick}
                        style={{ fontSize: 11, borderRadius: 6, height: 28, padding: '0 12px', fontWeight: 700, background: '#10b981', borderColor: '#10b981' }}
                    >
                        + 매수 추가
                    </Button>
                    <div className="glass-card px-3 py-1 rounded-full text-[10px] font-bold text-blue-500 border border-blue-100 italic">
                        ACTIVE HOLDINGS
                    </div>
                </div>
            </div>
            <div className="glass-card rounded-[12px] overflow-hidden border border-sky-600 shadow-sm mb-10 p-2">
                <Table
                    className="pastel-table"
                    columns={lotColumns}
                    dataSource={activeLots.map(t => ({ ...t, key: t.id }))}
                    size="small"
                    pagination={false}
                    bordered={false}
                />
            </div>

            {/* Section 2: Realized History */}
            <div className="mb-4 flex justify-between items-center px-2">
                <Text strong style={{ fontSize: 15, color: '#a7b5ccff' }}>수수료 차감 후 수익 확정 내역</Text>
                <div className="glass-card px-3 py-1 rounded-full text-[10px] font-bold text-purple-500 border border-purple-100 italic">
                    REALIZED PROFIT
                </div>
            </div>
            <div className="glass-card rounded-[12px] overflow-hidden border border-sky-600 shadow-sm p-2">
                {realizedHistory.length > 0 ? (
                    <Table
                        className="pastel-table"
                        columns={historyColumns}
                        dataSource={realizedHistory.map(t => ({ ...t, key: t.id }))}
                        size="small"
                        pagination={false}
                        bordered={false}
                    />
                ) : (
                    <div className="p-8 text-center text-slate-300 font-medium bg-slate-50/50">아직 실현된 수익 내역이 없습니다.</div>
                )}
            </div>

            <Modal
                title={
                    <Space orientation="horizontal">
                        <TransactionOutlined style={{ color: '#ef4444' }} />
                        <span style={{ color: 'var(--foreground)' }}>선택 항목 매도 등록</span>
                    </Space>
                }
                open={sellModalOpen}
                onCancel={() => setSellModalOpen(false)}
                onOk={handleSellSubmit}
                okText="매도 확정"
                cancelText="취소"
                width={440}
                centered
                styles={{
                    mask: { backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.4)' },
                    header: { padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', marginBottom: 0 },
                    body: { padding: '32px' },
                    footer: { padding: '16px 32px 24px', borderTop: 'none' }
                }}
            >
                <Form form={sellForm} layout="vertical">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 mb-6">
                        <Text type="secondary" style={{ fontSize: 11, color: '#64748b' }}>매도 대상 매입가 (수수료 미포함)</Text>
                        <Text className="font-numeric" strong style={{ fontSize: 18, color: '#1e293b', display: 'block' }}>
                            {Number(selectedTx?.price || 0).toLocaleString()}원
                        </Text>
                    </div>
                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="quantity" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>매도 수량 (최대 {Number(selectedTx?.remainingQuantity || 0)})</Text>} rules={[{ required: true }]}>
                                <InputNumber className="font-numeric w-full" size="large" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="price" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>실제 매도 단가</Text>} rules={[{ required: true }]}>
                                <InputNumber className="font-numeric w-full" size="large" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="fee" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>매도 제비용</Text>}>
                                <InputNumber className="font-numeric w-full" size="large" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="tradeDate" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>매도 일자</Text>} rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Buy Modal */}
            <Modal
                title={
                    <Space orientation="horizontal">
                        <TransactionOutlined style={{ color: '#10b981' }} />
                        <span style={{ color: 'var(--foreground)' }}>{stockName} 매수 등록</span>
                    </Space>
                }
                open={buyModalOpen}
                onCancel={() => setBuyModalOpen(false)}
                onOk={handleBuySubmit}
                okText="매수 확정"
                cancelText="취소"
                width={440}
                centered
                styles={{
                    mask: { backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.4)' },
                    header: { padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', marginBottom: 0 },
                    body: { padding: '32px' },
                    footer: { padding: '16px 32px 24px', borderTop: 'none' }
                }}
            >
                <Form form={buyForm} layout="vertical">
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 mb-6">
                        <Text type="secondary" style={{ fontSize: 11, color: '#64748b' }}>현재가 (참고용)</Text>
                        <Text className="font-numeric" strong style={{ fontSize: 18, color: '#1e293b', display: 'block' }}>
                            {Number(currentPrice || 0).toLocaleString()}원
                        </Text>
                    </div>
                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="quantity" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>매수 수량</Text>} rules={[{ required: true }]}>
                                <InputNumber className="font-numeric w-full" size="large" style={{ borderRadius: 12 }} min={1} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="price" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>실제 매수 단가</Text>} rules={[{ required: true }]}>
                                <InputNumber className="font-numeric w-full" size="large" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="fee" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>매수 수수료</Text>}>
                                <InputNumber className="font-numeric w-full" size="large" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="tradeDate" label={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>매수 일자</Text>} rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </Drawer>
    );
}