'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Row, Col, Divider, Typography, Breadcrumb, Space, Button, Card, Modal, Form, Input, InputNumber, DatePicker, App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import SummaryStats from '../components/dashboard/SummaryStats';
import AssetPieChart from '../components/dashboard/AssetPieChart';
import StockTable from '../components/dashboard/StockTable';
import TransactionDrawer from '../components/dashboard/TransactionDrawer';
import PortfolioInsights from '../components/dashboard/PortfolioInsights';
import AIReportCard from '../components/dashboard/AIReportCard';
import WatchlistSection from '../components/dashboard/WatchlistSection';
// ▼▼▼ [중요] 훅 import (경로 확인해주세요) ▼▼▼
import { useStockData } from '../components/dashboard/useStockData';

const { Title, Text } = Typography;

export default function Home() {
  const { message } = App.useApp();
  
  // ▼▼▼ [핵심] useStockData 훅을 사용하여 데이터와 로직을 한 번에 가져옵니다.
  const { 
    stockSummaries, 
    portfolioSummary, 
    cashData, 
    updateCash, 
    addHolding,
    lastUpdate 
  } = useStockData();

  // UI 상태 관리
  const [transactions, setTransactions] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  
  const [newStockModalOpen, setNewStockModalOpen] = useState(false);
  const [newStockForm] = Form.useForm();

  // AI Analyst State
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // AI 리포트 가져오기 (이건 별도 API라 유지)
  const fetchAIReport = async () => {
    try {
      const res = await fetch('http://localhost:8000/ai/latest');
      const data = await res.json();
      if (!data.message) { 
        setAiReport(data);
      }
    } catch (e) {
      console.error("AI report fetch failed", e);
    }
  };

  useEffect(() => {
    fetchAIReport();
  }, []);

  // AI 분석 트리거
  const triggerAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const wlRes = await fetch('/api/watchlist');
      const wlData = await wlRes.json();
      const watchlist = wlData.map((w: any) => ({ name: w.name, code: w.ticker }));

      const response = await fetch('http://localhost:8000/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: stockSummaries.map(h => ({ name: h.name, code: h.code })),
          watchlist: watchlist
        }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setAiReport(result);
      message.success('새로운 AI 분석 리포트가 생성되었습니다.');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      message.error('AI 분석 생성에 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  // 실시간 선택된 종목 데이터 트래킹 (훅 데이터 기반)
  const latestSelectedStock = useMemo(() => 
    stockSummaries.find(h => h.code === selectedStock?.ticker) || selectedStock
  , [stockSummaries, selectedStock]);

  // 파이 차트 데이터 생성 (훅 데이터 기반)
  const pieData = useMemo(() => [
    ...stockSummaries.map(item => ({ type: item.name, value: item.currentAmount })),
    { type: '예수금', value: cashData.deposit },
    { type: 'CMA', value: cashData.cma }
  ].filter(item => item.value > 0), [stockSummaries, cashData]);

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
    // 훅 내부 데이터는 자동 갱신되지만, 즉시 반영을 위해 페이지 리로드 혹은 로직 추가 가능
    // 여기서는 간단히 선택된 종목 갱신 로직만 유지
    if (selectedStock) {
      handleRowClick(selectedStock);
    }
    // 페이지 전체 데이터는 useStockData의 interval에 의해 갱신됨
    window.location.reload(); // 가장 확실한 방법 (임시)
  };

  const handleCashUpdate = async (data: any) => {
    await updateCash(data); // 훅의 함수 사용
    message.success('현금 자산이 업데이트되었습니다.');
  };

  const handleNewStockSubmit = async () => {
    try {
      const values = await newStockForm.validateFields();
      
      // 훅의 addHolding 사용 또는 기존 API 호출 유지
      // 트랜잭션 기록이 중요하므로 기존 API 호출 방식을 유지하되, 성공 후 훅 갱신 유도
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
        // 데이터 갱신을 위해 리로드 (useStockData에 강제 리프레시 기능이 없다면)
        window.location.reload();
      } else {
        message.error('등록 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="glass-card mb-8 p-6 rounded-3xl border border-white/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300">
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ title: 'Home' }, { title: 'Dashboard' }]} className="mb-1 text-[10px] uppercase tracking-widest font-bold opacity-40" />
          <Title level={1} style={{ margin: 0, fontWeight: 900, letterSpacing: '-2px', color: 'var(--foreground)', fontSize: 32 }}>
            Portfolio <Text style={{ fontSize: 24, fontWeight: 300, color: 'var(--foreground)', opacity: 0.6, marginLeft: 4 }}>Analytics</Text>
          </Title>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>LAST SYNC</Text>
            <Text className="font-numeric" strong style={{ fontSize: 14, color: 'var(--foreground)', opacity: 0.9 }}>{lastUpdate || '--:--:--'}</Text>
          </div>
          <Button size="large" type="default" onClick={() => setNewStockModalOpen(true)} style={{ borderRadius: 14, height: 48, padding: '0 24px', fontWeight: 700, background: '#10b981', borderColor: '#10b981', color: 'white', marginRight: 12 }}>
            + 신규 종목 매수
          </Button>
          <Button size="large" type="primary" icon={<ReloadOutlined />} onClick={() => window.location.reload()} style={{ borderRadius: 14, height: 48, padding: '0 28px', fontWeight: 700, boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)', border: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
            데이터 동기화
          </Button>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Section */}
        <Col xs={24} lg={7}>
          <Space orientation="vertical" size={32} style={{ width: '100%' }}>
            <SummaryStats
              totalAssets={portfolioSummary.totalCurrentAmount} // 훅 데이터 연결
              todayPnL={portfolioSummary.totalNetProfit}
              totalBuyAmount={portfolioSummary.totalBuyAmount}
              cashDeposit={cashData.deposit}
              cashCma={cashData.cma}
              // ▼▼▼ [수정] 0 대신 실제 데이터를 연결합니다 ▼▼▼
              totalCumulativeDeposit={cashData.totalDeposit || 0}
              totalCumulativeWithdrawal={cashData.totalWithdrawal || 0}              
              onUpdateCash={handleCashUpdate}
            />

            <AIReportCard
              data={aiReport}
              loading={aiLoading}
              onRefresh={triggerAIAnalysis}
            />

            <Card className="shadow-sm border-slate-100 dark:border-slate-800 overflow-hidden" styles={{ header: { background: 'rgba(52, 211, 153, 0.05)', borderBottom: '1px solid rgba(52, 211, 153, 0.1)', minHeight: 40 }, body: { padding: '20px 16px' } }} title={<Space size={8} orientation="horizontal"><div className="w-1.5 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" /><span className="text-sm font-bold" style={{ color: 'var(--foreground)', opacity: 0.8 }}>자산 배분 현황</span></Space>}>
              <AssetPieChart data={pieData} />
            </Card>

            <PortfolioInsights
              holdings={stockSummaries.map(h => ({
                name: h.name,
                ticker: h.code,
                currentAmount: h.currentAmount,
                yield: Number(h.returnRate)
              }))}
              cashTotal={portfolioSummary.totalCash}
            />
          </Space>
        </Col>

        {/* Right Section */}
        <Col xs={24} lg={17}>
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
            // ▼▼▼ [핵심 수정] 훅 데이터를 Table 포맷으로 매핑하며 strategy 전달 ▼▼▼
            data={stockSummaries.map(s => ({
              key: s.code,
              ticker: s.code,
              name: s.name,
              quantity: s.quantity,
              avgPrice: s.avgBuyPrice,
              currentPrice: s.currentPrice,
              changeRate: s.change_rate || 0,
              yield: Number(s.returnRate),
              PnL: s.netProfit,
              allocation: portfolioSummary.totalCurrentAmount > 0 
                ? (s.currentAmount / portfolioSummary.totalCurrentAmount) * 100 
                : 0,
              strategy: s.strategy // 👈 전략 데이터 필드 연결!
            }))}
            onRowClick={handleRowClick}
            aiReport={aiReport}
          />

          <Divider style={{ margin: '40px 0' }} />
          <WatchlistSection aiReport={aiReport} />
        </Col>
      </Row>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticker={latestSelectedStock?.code || latestSelectedStock?.ticker || ''}
        stockName={latestSelectedStock?.name || ''}
        transactions={transactions}
        currentPrice={latestSelectedStock?.currentPrice || 0}
        changeRate={latestSelectedStock?.change_rate || latestSelectedStock?.changeRate || 0}
        onTransactionSuccess={onTransactionSuccess}
      />

      {/* New Stock Purchase Modal */}
      <Modal title="신규 종목 매수 등록" open={newStockModalOpen} onCancel={() => setNewStockModalOpen(false)} onOk={handleNewStockSubmit} okText="매수 등록" cancelText="취소" width={500}>
        <Form form={newStockForm} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ticker" label="종목 코드" rules={[{ required: true, message: '종목 코드를 입력해주세요' }]}>
                <Input placeholder="예: 005930" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="종목명" rules={[{ required: true, message: '종목명을 입력해주세요' }]}>
                <Input placeholder="예: 삼성전자" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="매수 수량" rules={[{ required: true, message: '수량을 입력해주세요' }]} initialValue={1}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="price" label="매수 단가" rules={[{ required: true, message: '단가를 입력해주세요' }]}>
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
              <Form.Item name="tradeDate" label="매수 일자" rules={[{ required: true, message: '날짜를 선택해주세요' }]} initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </main>
  );
}