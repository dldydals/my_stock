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
import { useStockData } from '../components/dashboard/useStockData';

const { Title, Text } = Typography;

export default function Home() {
  const { message } = App.useApp();
  
  // 훅 데이터 가져오기
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

  // ▼▼▼ [추가 1] 자동 실행 중복 방지용 플래그 ▼▼▼
  const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);

  // AI 리포트 가져오기 (초기 로딩용)
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

  // AI 분석 트리거 함수
  const triggerAIAnalysis = async () => {
    setAiLoading(true);
    try {
      // 1. 관심 종목 가져오기
      const wlRes = await fetch('/api/watchlist');
      const wlData = await wlRes.json();
      const watchlist = wlData.map((w: any) => ({ name: w.name, code: w.ticker }));

      // 2. Next.js API를 통해 파이썬 서버 호출
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: stockSummaries.map(h => ({ name: h.name, code: h.code })),
          watchlist: watchlist
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // 3. 결과 상태 업데이트
      setAiReport(result);
      message.success('최신 시장 데이터로 AI 분석을 완료했습니다.');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      message.error('AI 분석 생성에 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  // ▼▼▼ [추가 2] 날짜 비교 후 자동 실행 로직 (핵심) ▼▼▼
  useEffect(() => {
    // 1. 데이터가 아직 준비 안 됐으면 대기 (보유 종목이 있어야 분석 가능)
    if (stockSummaries.length === 0) return;
    
    // 2. 이미 자동 갱신을 시도했거나, 현재 분석 중이면 패스
    if (hasAutoRefreshed || aiLoading) return;

    // 3. 오늘 날짜와 리포트 날짜 비교
    const today = dayjs().format('YYYY-MM-DD');
    const reportDate = aiReport?.date; 

    // 4. 리포트가 없거나, 날짜가 오늘이 아니면 -> 자동 분석 시작!
    if (!reportDate || reportDate !== today) {
        console.log(`📉 리포트 날짜(${reportDate || '없음'})가 오늘(${today})과 다릅니다. 자동 갱신 시작...`);
        setHasAutoRefreshed(true); // "나 실행했어" 표시 (무한루프 방지)
        triggerAIAnalysis();
    }
  }, [stockSummaries, aiReport, aiLoading, hasAutoRefreshed]); // 의존성 배열
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // 실시간 선택된 종목 데이터 트래킹
  const latestSelectedStock = useMemo(() => 
    stockSummaries.find(h => h.code === selectedStock?.ticker) || selectedStock
  , [stockSummaries, selectedStock]);

  // 파이 차트 데이터 생성
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
    if (selectedStock) {
      handleRowClick(selectedStock);
    }
    window.location.reload(); 
  };

  const handleCashUpdate = async (data: any) => {
    await updateCash(data); 
    message.success('현금 자산이 업데이트되었습니다.');
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
              totalAssets={portfolioSummary.totalCurrentAmount} 
              todayPnL={portfolioSummary.totalNetProfit}
              totalBuyAmount={portfolioSummary.totalBuyAmount}
              cashDeposit={cashData.deposit}
              cashCma={cashData.cma}
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
              strategy: s.strategy
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