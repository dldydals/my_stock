import pandas as pd
import ta # pandas_ta 대신 ta 사용
#import psycopg2
from sqlalchemy import create_engine # <-- 이걸 씁니다
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

# 1. DB 접속 설정
load_dotenv()
original_db_url = os.getenv("DATABASE_URL")

# ▼▼▼ [수정된 부분] Prisma용 파라미터(?schema=public) 제거 로직 ▼▼▼
if not original_db_url:
    print("⚠️ .env 파일 로드 실패 혹은 DATABASE_URL 없음")
    exit()

# URL에 '?'가 있다면 그 앞부분만 잘라서 씁니다.
# 예: postgresql://...?schema=public  ->  postgresql://...
db_url = original_db_url.split("?")[0]

result = urlparse(db_url)
DB_CONFIG = {
    "host": result.hostname,
    "database": result.path[1:],
    "user": result.username,
    "password": result.password,
    "port": result.port if result.port else 5432
}

def get_db_connection():
    #return psycopg2.connect(**DB_CONFIG)
    # SQLAlchemy 엔진 생성 (판다스가 좋아하는 방식)
    return create_engine(db_url)

# ... (앞부분 임포트 및 DB 설정은 그대로 유지) ...

def get_technical_summary(ticker):
    engine = get_db_connection()
    
    # 2. DB에서 데이터 가져오기
    query = """
        SELECT date, open, high, low, close, volume 
        FROM daily_stock_prices 
        WHERE ticker = %(ticker)s 
        ORDER BY date ASC
    """
    df = pd.read_sql(query, engine, params={'ticker': ticker}, index_col='date')
    
    if len(df) < 120:
        return None

    # 3. 기술적 지표 계산 (ta 라이브러리)
    rsi_indicator = ta.momentum.RSIIndicator(close=df['close'], window=14)
    df['RSI'] = rsi_indicator.rsi()
    
    df['SMA_5'] = ta.trend.SMAIndicator(close=df['close'], window=5).sma_indicator()
    df['SMA_20'] = ta.trend.SMAIndicator(close=df['close'], window=20).sma_indicator()
    df['SMA_60'] = ta.trend.SMAIndicator(close=df['close'], window=60).sma_indicator()
    df['SMA_120'] = ta.trend.SMAIndicator(close=df['close'], window=120).sma_indicator()

    bollinger = ta.volatility.BollingerBands(close=df['close'], window=20, window_dev=2)
    df['BB_HIGH'] = bollinger.bollinger_hband()
    df['BB_LOW'] = bollinger.bollinger_lband()
    
    # 4. 최신 데이터 추출
    latest = df.iloc[-1]
    prev = df.iloc[-2]

    # ▼▼▼ [추가된 부분] 최근 30일치 데이터를 텍스트 표로 변환 ▼▼▼
    # AI가 패턴(쌍바닥, 헤드앤숄더 등)을 인식할 수 있게 날짜/시/고/저/종 데이터를 줍니다.
    # to_string()을 쓰면 예쁜 표 형식의 문자열이 됩니다.
    recent_df = df.tail(30)[['open', 'high', 'low', 'close', 'volume']]
    recent_chart_str = recent_df.to_string(header=True, index=True)
    # ▲▲▲ [추가 끝] ▲▲▲

    is_bullish = latest['SMA_20'] > latest['SMA_60'] > latest['SMA_120']
    
    summary = {
        "ticker": ticker,
        "current_price": int(latest['close']),
        "rsi": round(latest['RSI'], 1),
        "rsi_status": "과매도(살 기회)" if latest['RSI'] <= 30 else "과매수(팔 기회)" if latest['RSI'] >= 70 else "중립",
        "sma_status": "정배열(상승추세)" if is_bullish else "역배열/혼조세",
        "bollinger_pos": "하단 터치(반등 기대)" if latest['close'] <= latest['BB_LOW'] else "밴드 내 위치",
        "golden_cross": True if (prev['SMA_20'] < prev['SMA_60']) and (latest['SMA_20'] > latest['SMA_60']) else False,
        "recent_chart": recent_chart_str # 요약에 차트 데이터 포함
    }

    return summary

def create_ai_prompt(ticker):
    """
    AI에게 보낼 최종 프롬프트 텍스트 조립
    """
    data = get_technical_summary(ticker)
    if not data:
        return "데이터 부족"

    # 프롬프트 템플릿
    prompt_text = f"""
    [종목 리포트: {data['ticker']}]
    현재가: {data['current_price']:,}원
    
    1. 기술적 지표 요약 (Fact)
    - RSI(14): {data['rsi']} ({data['rsi_status']})
    - 이평선 상태: {data['sma_status']}
    - 볼린저밴드: {data['bollinger_pos']}
    - 골든크로스 발생: {'✅ 예' if data['golden_cross'] else '아니오'}
    
    2. 최근 30일 차트 데이터 (Pattern Analysis)
    (아래 데이터를 보고 지지/저항 라인과 캔들 패턴을 분석하라)
    -------------------------------------------------------
    {data['recent_chart']}
    -------------------------------------------------------
    
    3. 지시사항
    위 데이터를 바탕으로 '단기 매매 전략'을 JSON으로 제시하라.
    특히 RSI가 {data['rsi']}이고 최근 차트 흐름을 고려하여 '정확한 진입가(entry_price)'를 산정하라.
    """
    
    return prompt_text

# ... (실행부는 동일)

# 테스트
if __name__ == "__main__":
    print(create_ai_prompt("012330")) # 삼성전자 프롬프트 생성 테스트

if __name__ == "__main__":
    # 테스트
    tickers = ["012330", "^IXIC"] 
    print("\n📊 [AI에게 보낼 요약 데이터 미리보기]\n")
    for t in tickers:
        try:
            data = get_technical_summary(t)
            if data:
                print(f"=== {t} 분석 결과 ===")
                print(data)
                print("-" * 30)
            else:
                print(f"⚠️ {t}: 데이터 부족으로 분석 불가 (최소 120일 필요)")
        except Exception as e:
            print(f"❌ {t} 분석 실패: {e}")