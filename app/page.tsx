'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Row, Col, Divider, Typography, Breadcrumb, Space, Button, Card, Modal, Form, Input, InputNumber, DatePicker, message } from 'antd';
import { ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import SummaryStats from '../components/dashboard/SummaryStats';
import AssetPieChart from '../components/dashboard/AssetPieChart';
import StockTable from '../components/dashboard/StockTable';
import TransactionDrawer from '../components/dashboard/TransactionDrawer';
import PortfolioInsights from '../components/dashboard/PortfolioInsights';

const { Title, Text } = Typography;

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [newStockModalOpen, setNewStockModalOpen] = useState(false);
  const [newStockForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [holdRes, cashRes] = await Promise.all([
        fetch('/api/holdings'),
        fetch('/api/cash')
      ]);

      const holdData = await holdRes.json();
      const cashData = await cashRes.json();

      if (!holdData.error) {
        setHoldings(holdData);
      }

      if (!cashData.error) {
        setBalances([
          { type: 'DEPOSIT', balance: cashData.deposit },
          { type: 'CMA', balance: cashData.cma },
          { type: 'TOTAL_DEPOSIT', balance: cashData.totalDeposit },
          { type: 'TOTAL_WITHDRAWAL', balance: cashData.totalWithdrawal }
        ]);
      }
    } catch (e) {
      console.error("Data fetch failed", e);
    } finally {
      setLoading(false);
      setLastSyncTime(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchData();
    // 10초마다 자동 갱신
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalAssetsValue = useMemo(() => holdings.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0), [holdings]);
  const totalBuyAmount = useMemo(() => holdings.reduce((sum, item) => sum + (item.avgPrice * item.quantity), 0), [holdings]);
  const totalPnL = totalAssetsValue - totalBuyAmount;


  const deposit = useMemo(() => balances.find(b => b.type === 'DEPOSIT')?.balance || 0, [balances]);
  const cma = useMemo(() => balances.find(b => b.type === 'CMA')?.balance || 0, [balances]);
  const totalDeposit = useMemo(() => balances.find(b => b.type === 'TOTAL_DEPOSIT')?.balance || 0, [balances]);
  const totalWithdrawal = useMemo(() => balances.find(b => b.type === 'TOTAL_WITHDRAWAL')?.balance || 0, [balances]);

  // 실시간 선택된 종목 데이터 트래킹
  const latestSelectedStock = useMemo(() =>
    holdings.find(h => h.ticker === selectedStock?.ticker) || selectedStock
    , [holdings, selectedStock]);

  const pieData = useMemo(() => [
    ...holdings.map(item => ({ type: item.name, value: item.currentPrice * item.quantity })),
    { type: '예수금', value: deposit },
    { type: 'CMA', value: cma }
  ].filter(item => item.value > 0), [holdings, deposit, cma]);

  const handleRowClick = async (record: any) => {
    setSelectedStock(record);
    setDrawerOpen(true);
    try {
      const res = await fetch(`/api/transactions?ticker=${record.ticker}`);
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error("Transaction fetch failed", e);
    }
  };

  const onTransactionSuccess = () => {
    fetchData();
    if (selectedStock) {
      handleRowClick(selectedStock);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  const handleCashUpdate = async (data: { deposit?: number; cma?: number; totalDeposit?: number; totalWithdrawal?: number }) => {
    try {
      const res = await fetch('/api/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        console.log("Cash update successful, fetching new data...");
        await fetchData();
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("API returned error for cash update:", errorData.error);
        alert(`저장 실패: ${errorData.error}`);
      }
    } catch (e) {
      console.error("Cash update failed", e);
    }
  };

  const handleNewStockSubmit = async () => {
    try {
      const values = await newStockForm.validateFields();

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: values.ticker.padStart(6, '0'),
          name: values.name,
          type: 'BUY',
          quantity: values.quantity,
          price: values.price,
          fee: values.fee || 0,
          tradeDate: values.tradeDate.toISOString(),
        }),
      });

      if (res.ok) {
        message.success('신규 종목 매수가 등록되었습니다.');
        setNewStockModalOpen(false);
        newStockForm.resetFields();
        await fetchData();
      } else {
        message.error('등록 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Hydration fix for client-side only time rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen">
      {/* Premium Glass Header */}
      <div className="glass-card mb-8 p-6 rounded-3xl border border-white/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300">
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { title: 'Home' },
              { title: 'Dashboard' },
            ]}
            className="mb-1 text-[10px] uppercase tracking-widest font-bold opacity-40"
          />
          <Title level={1} style={{ margin: 0, fontWeight: 900, letterSpacing: '-2px', color: 'var(--foreground)', fontSize: 32 }}>
            Portfolio <Text style={{ fontSize: 24, fontWeight: 300, color: 'var(--foreground)', opacity: 0.6, marginLeft: 4 }}>Analytics</Text>
          </Title>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>LAST SYNC</Text>
            <Text className="font-numeric" strong style={{ fontSize: 14, color: 'var(--foreground)', opacity: 0.9 }}>{lastSyncTime || '--:--:--'}</Text>
          </div>
          <Button
            size="large"
            type="default"
            onClick={() => setNewStockModalOpen(true)}
            style={{
              borderRadius: 14,
              height: 48,
              padding: '0 24px',
              fontWeight: 700,
              background: '#10b981',
              borderColor: '#10b981',
              color: 'white',
              marginRight: 12
            }}
          >
            + 신규 종목 매수
          </Button>
          <Button
            size="large"
            type="primary"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={refreshData}
            style={{
              borderRadius: 14,
              height: 48,
              padding: '0 28px',
              fontWeight: 700,
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            }}
          >
            데이터 동기화
          </Button>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Section: Stats and Chart */}
        <Col xs={24} lg={9}>
          <Space orientation="vertical" size={32} style={{ width: '100%' }}>
            <SummaryStats
              totalAssets={totalAssetsValue}
              todayPnL={totalPnL}
              totalBuyAmount={totalBuyAmount}
              cashDeposit={deposit}
              cashCma={cma}
              totalCumulativeDeposit={totalDeposit}
              totalCumulativeWithdrawal={totalWithdrawal}
              onUpdateCash={handleCashUpdate}
            />
            <Card
              className="shadow-sm border-slate-100 dark:border-slate-800 overflow-hidden"
              styles={{
                header: { background: 'rgba(52, 211, 153, 0.05)', borderBottom: '1px solid rgba(52, 211, 153, 0.1)', minHeight: 40 },
                body: { padding: '20px 16px' }
              }}
              title={
                <Space size={8} orientation="horizontal">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                  <span className="text-sm font-bold" style={{ color: 'var(--foreground)', opacity: 0.8 }}>자산 배분 현황</span>
                </Space>
              }
            >
              <AssetPieChart data={pieData} />
            </Card>

            <PortfolioInsights
              holdings={holdings.map(h => ({
                name: h.name,
                ticker: h.ticker,
                currentAmount: h.currentPrice * h.quantity,
                yield: h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0
              }))}
              cashTotal={deposit + cma}
            />
          </Space>
        </Col>

        {/* Right Section: Main Table Area turned into Card Grid Area */}
        <Col xs={24} lg={15}>
          <div className="flex justify-between items-center mb-6 pl-2">
            <Space size={12}>
              <div className="w-2 h-6 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
              <Title level={4} style={{ margin: 0, fontWeight: 800, color: 'var(--foreground)' }}>보유 종목 리포트</Title>
            </Space>
            <div className="glass-card px-4 py-1.5 rounded-full border border-white/40">
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>단위: KRW • 세후</Text>
            </div>
          </div>

          <StockTable
            data={holdings}
            onRowClick={handleRowClick}
          />
        </Col>
      </Row>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticker={latestSelectedStock?.ticker || ''}
        stockName={latestSelectedStock?.name || ''}
        transactions={transactions}
        currentPrice={latestSelectedStock?.currentPrice || 0} // Pass real-time currentPrice
        changeRate={latestSelectedStock?.changeRate || 0} // Pass daily change rate
        onTransactionSuccess={onTransactionSuccess}
      />

      {/* New Stock Purchase Modal */}
      <Modal
        title="신규 종목 매수 등록"
        open={newStockModalOpen}
        onCancel={() => setNewStockModalOpen(false)}
        onOk={handleNewStockSubmit}
        okText="매수 등록"
        cancelText="취소"
        width={500}
      >
        <Form form={newStockForm} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="ticker"
                label="종목 코드"
                rules={[{ required: true, message: '종목 코드를 입력해주세요' }]}
              >
                <Input placeholder="예: 005930" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="종목명"
                rules={[{ required: true, message: '종목명을 입력해주세요' }]}
              >
                <Input placeholder="예: 삼성전자" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="매수 수량"
                rules={[{ required: true, message: '수량을 입력해주세요' }]}
                initialValue={1}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="price"
                label="매수 단가"
                rules={[{ required: true, message: '단가를 입력해주세요' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fee" label="수수료" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tradeDate"
                label="매수 일자"
                rules={[{ required: true, message: '날짜를 선택해주세요' }]}
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </main>
  );
}
