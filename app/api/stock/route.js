// app/api/stock/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  try {
    // WSL 내부의 파이썬 서버(8000포트)에 데이터 요청
    const response = await fetch(`http://localhost:8000/price/${ticker}`);
    const data = await response.json();
    
    return NextResponse.json({
      ticker: data.ticker,
      currentPrice: data.price,
      time: new Date().toLocaleTimeString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Python API 연결 실패' }, { status: 500 });
  }
}