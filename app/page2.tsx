"use client";
import { useEffect, useRef, useState } from 'react';

export default function Dashboard() {
  const canvasRef = useRef(null);
  const [stock, setStock] = useState({ name: 'SK스퀘어', ticker: '402340', buyPrice: 213000, qty: 454, currentPrice: 0 });

  // 3초마다 데이터 갱신
  useEffect(() => {
    const updatePrice = async () => {
      try {
        const res = await fetch(`/api/stock?ticker=${stock.ticker}`);
        const data = await res.json();
        setStock(prev => ({ ...prev, currentPrice: data.currentPrice }));
      } catch (e) { console.error("데이터 로드 실패"); }
    };

    updatePrice();
    const timer = setInterval(updatePrice, 30000);
    return () => clearInterval(timer);
  }, []);

  // Canvas 드로잉 (미려한 디자인 적용)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { currentPrice, buyPrice, qty, name } = stock;
    if (!currentPrice) return;

    // 초기화 및 배경 (다크 테마)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const profit = (currentPrice - buyPrice) * qty;
    const yieldRate = ((currentPrice - buyPrice) / buyPrice) * 100;
    const isPlus = profit >= 0;

    // 카드 스타일 배경
    ctx.fillStyle = "#1e293b";
    ctx.roundRect(20, 20, 360, 160, 15);
    ctx.fill();

    // 텍스트 렌더링
    ctx.font = "20px Pretendard";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(name, 40, 60);

    ctx.font = "bold 32px Orbitron";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(`${currentPrice.toLocaleString()}원`, 40, 110);

    ctx.font = "18px Pretendard";
    ctx.fillStyle = isPlus ? "#ff4d4d" : "#4d94ff";
    ctx.fillText(`${isPlus ? '▲' : '▼'} ${profit.toLocaleString()}원 (${yieldRate.toFixed(2)}%)`, 40, 150);

  }, [stock]);

  return (
    <main style={{ background: '#020617', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas ref={canvasRef} width={400} height={200} />
    </main>
  );
}