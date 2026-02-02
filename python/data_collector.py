import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'database': os.environ.get("POSTGRES_DB", "postgres"), 
}

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise Exception("DATABASE_URL not found in environment")
    if "?" in db_url:
        db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)

def get_last_date(cur, ticker):
    cur.execute("SELECT date FROM daily_stock_prices WHERE ticker = %s ORDER BY date DESC LIMIT 1", (ticker,))
    res = cur.fetchone()
    return res[0] if res else None

def save_to_db(cur, data_list):
    query = """
    INSERT INTO daily_stock_prices (ticker, date, open, high, low, close, volume, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
    ON CONFLICT (ticker, date) DO UPDATE 
    SET close = EXCLUDED.close, 
        volume = EXCLUDED.volume,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        created_at = NOW()
    """
    cur.executemany(query, data_list)

def fetch_and_save_data(tickers_map):
    conn = get_db_connection()
    cur = conn.cursor()
    print(f"🔄 데이터 수집기(Data Collector) 가동...")

    target_items = tickers_map.items() if isinstance(tickers_map, dict) else [(t['name'], t['code']) for t in tickers_map]

    for name, code in target_items:
        try:
            # 1. 수집 기간 설정
            last_date = get_last_date(cur, code)
            if last_date:
                start_date = (last_date + timedelta(days=1)).strftime('%Y-%m-%d')
            else:
                start_date = (datetime.now() - timedelta(days=365*3)).strftime('%Y-%m-%d')

            # 종료일은 '내일'로 설정
            today_str = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
            
            if start_date >= today_str:
                continue

            print(f"📥 [{name}] 다운로드 시도... ({start_date} ~ {today_str})")

            # 2. 데이터 다운로드
            df = pd.DataFrame()
            try:
                if not str(code).isdigit():
                     df = yf.download(code, start=start_date, end=today_str, progress=False, auto_adjust=True)
                else:
                    yf_ticker = f"{code}.KS"
                    df = yf.download(yf_ticker, start=start_date, end=today_str, progress=False, auto_adjust=True)
                    
                    if df.empty:
                        yf_ticker = f"{code}.KQ"
                        df = yf.download(yf_ticker, start=start_date, end=today_str, progress=False, auto_adjust=True)
            
            except Exception as e:
                # ▼▼▼ 여기가 문제였던 부분입니다. 한 줄로 잘 붙여넣어 주세요. ▼▼▼
                print(f"⚠️ [{name}] yfinance 내부 오류 발생 (Skip): {e}")
                continue

            # 3. 데이터 검증
            if df is None or df.empty:
                print(f"❌ [{name}] 데이터 수집 실패 (데이터 없음)")
                continue

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            # 5. 데이터 가공 및 리스트 변환
            data_list = []
            for index, row in df.iterrows():
                try:
                    raw_close = row.get('Close', 0)
                    raw_vol = row.get('Volume', 0)
                    
                    val_close = float(raw_close.iloc[0]) if isinstance(raw_close, pd.Series) else float(raw_close)
                    val_vol = int(raw_vol.iloc[0]) if isinstance(raw_vol, pd.Series) else int(raw_vol)
                    
                    if pd.isna(val_close): continue

                    data_list.append((
                        code,
                        index.date(),
                        float(row['Open'].iloc[0]) if isinstance(row['Open'], pd.Series) else float(row['Open']),
                        float(row['High'].iloc[0]) if isinstance(row['High'], pd.Series) else float(row['High']),
                        float(row['Low'].iloc[0]) if isinstance(row['Low'], pd.Series) else float(row['Low']),
                        val_close,
                        val_vol
                    ))
                except Exception as inner_e:
                    continue 

            # 6. DB 저장
            if data_list:
                save_to_db(cur, data_list)
                conn.commit()
                print(f"💾 [{name}] {len(data_list)}건 저장 완료 (성공!)")
            else:
                print(f"⚠️ [{name}] 다운로드는 됐으나 유효한 데이터가 없음.")

        except Exception as e:
            print(f"❌ [{name}] 처리 중 에러 발생: {e}")
            conn.rollback()

    cur.close()
    conn.close()
    print("✨ 데이터 수집 작업 완료")