import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. 프론트엔드에서 보낸 데이터 받기
    const body = await request.json();
    const { holdings, watchlist } = body;

    console.log("📡 [Next.js API] Python 서버로 요청 전송...");

    // 2. Python FastAPI 서버로 전달 (Proxy)
    const pythonResponse = await fetch('http://127.0.0.1:8000/analysis/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holdings: holdings || [],
        watchlist: watchlist || [],
      }),
    });

    if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text();
        console.error("❌ Python Server Error:", errorText);
        return NextResponse.json(
            { error: 'Python Analysis Server Error', details: errorText }, 
            { status: pythonResponse.status }
        );
    }

    // 3. 결과 받아서 프론트엔드로 반환
    const data = await pythonResponse.json();
    console.log("✅ [Next.js API] 분석 결과 수신 완료!");
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("❌ API Route Error:", error);
    return NextResponse.json(
        { error: 'Internal Server Error', details: error.message },
        { status: 500 }
    );
  }
}