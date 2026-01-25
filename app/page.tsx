'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Row, Col, Divider, Typography, Breadcrumb, Space, Button, Card } from 'antd';
import { ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
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
  const [dividendStats, setDividendStats] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);

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
        // Fetch supplemental dividend data from Python API for each unique ticker
        const divYields: Record<string, number> = {};
        await Promise.all(holdData.map(async (h: any) => {
          try {
            const res = await fetch(`http://localhost:8000/stock/${h.ticker}`);
            const detail = await res.json();
            if (detail.dividend_yield) {
              divYields[h.ticker] = detail.dividend_yield;
            }
          } catch (e) {
            console.warn(`Failed to fetch dividend for ${h.ticker}`, e);
          }
        }));
        setDividendStats(divYields);
      }

      if (!cashData.error) {
        setBalances([
          { type: 'DEPOSIT', balance: cashData.deposit },
          { type: 'CMA', balance: cashData.cma }
        ]);
      }
    } catch (e) {
      console.error("Data fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalAssetsValue = useMemo(() => holdings.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0), [holdings]);
  const totalBuyAmount = useMemo(() => holdings.reduce((sum, item) => sum + (item.avgPrice * item.quantity), 0), [holdings]);
  const totalPnL = totalAssetsValue - totalBuyAmount;

  // Real Dividend Calculation: (currentPrice * qty) * (dividendYield / 100)
  const expectedDividends = useMemo(() => {
    return holdings.reduce((sum, item) => {
      const yieldRate = dividendStats[item.ticker] || 0;
      const amount = (item.currentPrice * item.quantity) * (yieldRate / 100);
      return sum + amount;
    }, 0);
  }, [holdings, dividendStats]);

  const deposit = useMemo(() => balances.find(b => b.type === 'DEPOSIT')?.balance || 0, [balances]);
  const cma = useMemo(() => balances.find(b => b.type === 'CMA')?.balance || 0, [balances]);

  const pieData = useMemo(() => [
    ...holdings.map(item => ({ type: item.name, value: item.currentPrice * item.quantity })),
    { type: '예수금', value: deposit },
    { type: 'CMA', value: cma }
  ], [holdings, deposit, cma]);

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

  const handleCashUpdate = async (data: { deposit: number; cma: number }) => {
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
            <Text className="font-numeric" strong style={{ fontSize: 14, color: 'var(--foreground)', opacity: 0.9 }}>{mounted ? new Date().toLocaleTimeString() : '--:--:--'}</Text>
          </div>
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
          <SummaryStats
            totalAssets={totalAssetsValue}
            todayPnL={totalPnL}
            expectedDividends={expectedDividends}
            cashDeposit={deposit}
            cashCma={cma}
            onUpdateCash={handleCashUpdate}
          />
          <Card
            className="shadow-sm border-slate-100 dark:border-slate-800 overflow-hidden"
            styles={{
              header: { background: 'rgba(52, 211, 153, 0.05)', borderBottom: '1px solid rgba(52, 211, 153, 0.1)', minHeight: 40 },
              body: { padding: '20px 16px' }
            }}
            title={
              <Space size={8}>
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
            cashTotal={deposit} // Use only deposit for 'investment' cash ratio if needed, or keep for full analysis
          />
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
        ticker={selectedStock?.ticker || ''}
        stockName={selectedStock?.name || ''}
        transactions={transactions}
        currentPrice={selectedStock?.currentPrice || 0} // Pass real-time currentPrice
        changeRate={selectedStock?.changeRate || 0} // Pass daily change rate
        onTransactionSuccess={onTransactionSuccess}
      />
    </main>
  );
}
