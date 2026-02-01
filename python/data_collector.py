import yfinance as yf
import psycopg2
from psycopg2.extras import execute_values
import pandas as pd
import json
import os
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from urllib.parse import urlparse # URL 파싱을 위해 추가

# 1. .env 파일 로드
load_dotenv()

# 2. DATABASE_URL 파싱 및 접속 설정
# 사용자가 .env에 적은 "postgresql://..." 주소를 자동으로 해석합니다.
db_url = os.getenv("DATABASE_URL")

if not db_url:
    raise ValueError("❌ .env 파일에 DATABASE_URL이 없습니다!")

# URL 파싱 (사용자명, 비번, 호스트, DB명을 분리)
result = urlparse(db_url)
username = result.username
password = result.password
database = result.path[1:] # '/' 제외
hostname = result.hostname
port = result.port

DB_CONFIG = {
    "host": hostname,
    "database": database,
    "user": username,
    "password": password,
    "port": port if port else 5432
}

# --- (이하 로직은 동일하지만, 안정성을 위해 전체 다시 기재합니다) ---

# Default Tickers
MARKET_INDICES = {
    'NASDAQ': '^IXIC',
    'DOW': '^DJI',
    'S&P500': '^GSPC',
    'USD/KRW': 'KRW=X',
    'US10Y': '^TNX',
    'SOXX': 'SOXX',
    'NVDA': 'NVDA',
    'MU': 'MU'
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def get_last_date(cursor, ticker):
    query = "SELECT MAX(date) FROM daily_stock_prices WHERE ticker = %s;"
    cursor.execute(query, (ticker,))
    result = cursor.fetchone()
    return result[0] if result else None

def save_to_db(cursor, data_list):
    if not data_list:
        return
    
    insert_query = """
        INSERT INTO daily_stock_prices (ticker, date, open, high, low, close, volume)
        VALUES %s
        ON CONFLICT (ticker, date) DO UPDATE 
        SET close = EXCLUDED.close, 
            volume = EXCLUDED.volume,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            open = EXCLUDED.open;
    """
    execute_values(cursor, insert_query, data_list)

# 기존 imports 유지...

def fetch_and_save_data(tickers_map):
    conn = get_db_connection()
    cur = conn.cursor()
    print(f"🔄 [{DB_CONFIG['database']}] 데이터 동기화 시작...")

    target_items = tickers_map.items() if isinstance(tickers_map, dict) else [(t['name'], t['code']) for t in tickers_map]

    for name, code in target_items:
        try:
            # DB에서 마지막 수집일 확인
            last_date = get_last_date(cur, code)
            if last_date:
                start_date = (last_date + timedelta(days=1)).strftime('%Y-%m-%d')
            else:
                start_date = (datetime.now() - timedelta(days=365*3)).strftime('%Y-%m-%d')

            today = datetime.now().strftime('%Y-%m-%d')

            if start_date > today:
                print(f"✅ [{name}] 이미 최신입니다.")
                continue

            print(f"📥 [{name}] 다운로드 시도... ({start_date} ~ {today})")

            # ▼▼▼ [핵심 수정] 스마트 티커 탐색 (KS -> KQ 순서 시도) ▼▼▼
            df = pd.DataFrame()
            
            # 1. 숫자가 아니면 (지수 등) 그대로 사용
            if not str(code).isdigit():
                 df = yf.download(code, start=start_date, end=today, progress=False, auto_adjust=True)
            else:
                # 2. 숫자면 KOSPI(.KS) 먼저 시도
                yf_ticker = f"{code}.KS"
                df = yf.download(yf_ticker, start=start_date, end=today, progress=False, auto_adjust=True)
                
                # 3. 데이터가 없으면 KOSDAQ(.KQ) 시도
                if df.empty:
                    print(f"   ↳ ⚠️ KOSPI(.KS) 데이터 없음. KOSDAQ(.KQ)으로 재시도...")
                    yf_ticker = f"{code}.KQ"
                    df = yf.download(yf_ticker, start=start_date, end=today, progress=False, auto_adjust=True)
            # ▲▲▲ [수정 끝] ▲▲▲

            if df.empty:
                print(f"❌ [{name}] 데이터 수집 실패 (KS/KQ 모두 없음)")
                continue

            # MultiIndex 컬럼 평탄화 (yfinance 최신 버전 대응)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            # 데이터 가공 및 저장
            data_list = []
            for index, row in df.iterrows():
                # 값 추출 및 안전한 형변환
                raw_close = row['Close']
                raw_vol = row['Volume']
                
                val_close = float(raw_close.iloc[0]) if isinstance(raw_close, pd.Series) else float(raw_close)
                val_vol = int(raw_vol.iloc[0]) if isinstance(raw_vol, pd.Series) else int(raw_vol)
                
                # NaN 체크
                if pd.isna(val_close): continue

                data_list.append((
                    code, # DB에는 항상 원본 코드(숫자 6자리)로 저장
                    index.date(),
                    float(row['Open'].iloc[0]) if isinstance(row['Open'], pd.Series) else float(row['Open']),
                    float(row['High'].iloc[0]) if isinstance(row['High'], pd.Series) else float(row['High']),
                    float(row['Low'].iloc[0]) if isinstance(row['Low'], pd.Series) else float(row['Low']),
                    val_close,
                    val_vol
                ))

            if data_list:
                save_to_db(cur, data_list)
                conn.commit()
                print(f"💾 [{name}] {len(data_list)}건 저장 완료 (성공!)")
            else:
                print(f"⚠️ [{name}] 데이터는 다운받았으나 유효한 행이 없음.")

        except Exception as e:
            print(f"❌ [{name}] 에러 발생: {e}")
            conn.rollback()

    cur.close()
    conn.close()
    print("✨ 동기화 로직 종료")

def get_naver_news_summary(holdings_info):
    print("📰 뉴스 수집 중...")
    news_report = {}
    headers = {'User-Agent': 'Mozilla/5.0'}

    for stock in holdings_info:
        name = stock['name']
        code = stock.get('code')
        if not code: continue

        try:
            headers['Referer'] = f'https://finance.naver.com/item/main.naver?code={code}'
            url = f"https://finance.naver.com/item/news_news.naver?code={code}&sm=title_entity_id.basic"
            res = requests.get(url, headers=headers)
            soup = BeautifulSoup(res.content.decode('euc-kr', 'replace'), 'html.parser')
            titles = soup.select('td.title a.tit') or soup.select('td.title a')
            articles = [t.get_text().strip() for t in titles[:10]]
            if not articles: articles = ["특이 뉴스 없음"]
            news_report[name] = articles
        except Exception as e:
            print(f"Error news {name}: {e}")
            news_report[name] = ["수집 실패"]

    return json.dumps(news_report, ensure_ascii=False)

if __name__ == "__main__":
    # 1. 시장 지수 저장
    fetch_and_save_data(MARKET_INDICES)

    # 2. 보유 종목 저장 (원하는 종목 추가)
    my_holdings = [
        {"name": "현대모비스", "code": "012330"},
        {"name": "SK스퀘어", "code": "402340"},
        # {"name": "현대차", "code": "005380"},
        # {"name": "LG디스플레이", "code": "034220"} 
    ]
    fetch_and_save_data(my_holdings)
    
    # 3. 뉴스 확인
    # print(get_naver_news_summary(my_holdings))