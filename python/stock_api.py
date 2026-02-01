import os
import json
import psycopg2
from psycopg2.extras import Json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pykrx import stock
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import datetime as dt_module
from dotenv import load_dotenv

# ▼▼▼ 추가된 라이브러리 (크롤링, 스케줄러, 파일저장) ▼▼▼
import requests
from bs4 import BeautifulSoup
from io import StringIO
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
# ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

load_dotenv()

from ai_analyst import AIAnalyst

# =========================================================
# 💾 [Global Cache] & 📁 [File Persistence]
# =========================================================
CACHE_FILE = "investor_cache.json"
INVESTOR_CACHE = {}

def load_cache():
    """서버 시작 시 파일에서 캐시 불러오기"""
    global INVESTOR_CACHE
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                INVESTOR_CACHE = json.load(f)
            print(f"✅ [System] 캐시 파일 복구 완료: {len(INVESTOR_CACHE)}개 종목")
        except Exception as e:
            print(f"⚠️ [System] 캐시 파일 로드 실패: {e}")

def save_cache():
    """캐시 업데이트 시 파일로 저장하기"""
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(INVESTOR_CACHE, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"⚠️ [System] 캐시 저장 실패: {e}")

# =========================================================
# 🕷️ [Crawler] 네이버 금융 잠정치 크롤링
# =========================================================
def crawl_naver_preliminary(ticker: str):
    """네이버 금융에서 특정 종목의 잠정치를 가져와 반환"""
    url = f"https://finance.naver.com/item/frgn.naver?code={ticker}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        response = requests.get(url, headers=headers, timeout=2)
        html = response.content.decode('euc-kr', 'replace')
        soup = BeautifulSoup(html, 'html.parser')
        
        target_table = None
        for table in soup.find_all("table", class_="type2"):
            if "잠정" in table.text:
                target_table = table
                break
        
        if not target_table:
            analysis_div = soup.find('div', {'id': 'analysis'})
            if analysis_div:
                target_table = analysis_div.find('table')

        if target_table:
            df = pd.read_html(StringIO(str(target_table)))[0]
            df = df.dropna(how='all')
            if len(df.columns) >= 3:
                # 유효한 시간대 데이터만 필터링 (09:00, 10:00 등 시간이 있는 행)
                valid_rows = df[df.iloc[:, 0].str.contains(':', na=False)]
                if not valid_rows.empty:
                    # 가장 최신(마지막 행) 데이터를 가져옴
                    latest = valid_rows.iloc[-1]
                    return {
                        'time': latest.iloc[0],
                        'foreigner': int(str(latest.iloc[1]).replace(',', '')),
                        'institution': int(str(latest.iloc[2]).replace(',', ''))
                    }
    except Exception:
        pass
    return None

# =========================================================
# ⏰ [Scheduler Job] 수급 데이터 백그라운드 갱신
# =========================================================
def update_all_investor_data():
    """DB의 Watchlist 종목들을 긁어서 캐시를 업데이트하고 파일로 저장"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔄 수급 데이터 백그라운드 갱신 시작...")
    
    target_tickers = set()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT ticker FROM watchlist")
        for row in cur.fetchall():
            target_tickers.add(row[0])
        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB Error during schedule: {e}")

    count = 0
    updated = False
    for ticker in target_tickers:
        data = crawl_naver_preliminary(ticker)
        if data:
            INVESTOR_CACHE[ticker] = data
            count += 1
            updated = True
            
    if updated:
        save_cache()
            
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ {count}/{len(target_tickers)} 종목 갱신 및 저장 완료.")

# =========================================================
# 🚀 [Lifespan] 서버 시작/종료 관리
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. 시작 시 캐시 로드
    load_cache()
    
    # 2. 스케줄러 시작
    scheduler = BackgroundScheduler()
    scheduler.add_job(update_all_investor_data, 'interval', minutes=10) # 10분 주기
    
    # 주요 발표 시간대 Cron 등록 (보조)
    for h, m in [('9','32'), ('10','02'), ('11','32'), ('13','22'), ('14','32')]:
        scheduler.add_job(update_all_investor_data, 'cron', hour=h, minute=m)
        
    scheduler.start()
    
    # 3. 서버 시작 직후 한 번 실행 (데이터 최신화)
    scheduler.add_job(update_all_investor_data)
    
    yield # 앱 실행 중...
    
    # 4. 종료 시 스케줄러 끄기
    scheduler.shutdown()

# 앱 생성 (Lifespan 적용)
app = FastAPI(lifespan=lifespan)
ai_analyst = AIAnalyst()

# Database Connection Helper
def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise Exception("DATABASE_URL not found in environment")
    if "?" in db_url:
        db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🛠️ [Helper] 유효한 데이터 찾기 도우미 함수
def get_valid_fundamental(ticker: str, retries=5):
    for i in range(retries):
        target_date = (datetime.now() - timedelta(days=i)).strftime("%Y%m%d")
        try:
            df = stock.get_market_fundamental_by_ticker(date=target_date, market="ALL")
            if not df.empty and ticker in df.index:
                row = df.loc[ticker]
                if row['PBR'] > 0 or row['DIV'] > 0:
                    return row
        except Exception:
            continue
    return None

def get_valid_investor_data(ticker: str, retries=5):
    """Pykrx를 통해 '확정된' 최신 수급 데이터를 가져옴 (장 마감 데이터)"""
    for i in range(retries):
        target_date = (datetime.now() - timedelta(days=i)).strftime("%Y%m%d")
        try:
            df = stock.get_market_investor_net_purchase_by_date(target_date, target_date, ticker)
            if not df.empty:
                if df['외국인'].iloc[-1] != 0 or df['기관합계'].iloc[-1] != 0:
                    return df.iloc[-1]
        except:
            continue
    return None    

# [Endpoint] 상세 정보
@app.get("/stock/{ticker}")
def get_stock_detail(ticker: str):
    try:
        # 1. 시세 데이터
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=10)).strftime("%Y%m%d")
        
        df_price = stock.get_market_ohlcv(start_date, end_date, ticker)
        if df_price.empty:
            raise HTTPException(status_code=404, detail="No Price Data")
        
        last_price = df_price.iloc[-1]
        
        # 2. 펀더멘컬 데이터
        per, pbr, div_yield = None, None, None
        try:
            fund_data = get_valid_fundamental(ticker)
            if fund_data is not None:
                per = float(fund_data['PER'])
                pbr = float(fund_data['PBR'])
                div_yield = float(fund_data['DIV'])
        except Exception as fe:
            print(f"Fundamental scrape failed: {fe}")
        
        # 3. 시가총액
        market_cap = 0
        try:
            cap_df = stock.get_market_cap(end_date, end_date, ticker)
            if not cap_df.empty and ticker in cap_df.index:
                market_cap = int(cap_df.loc[ticker, "시가총액"])
        except:
            pass

        return {
            "ticker": ticker,
            "date": df_price.index[-1].strftime("%Y-%m-%d"),
            "price": int(last_price['종가']),
            "change_rate": float(last_price['등락률']),
            "per": per,
            "pbr": pbr,
            "dividend_yield": div_yield,
            "market_cap": market_cap,
            "data_source_status": "FUNDAMENTAL_UNAVAILABLE" if div_yield is None else "OK"
        }
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        print(f"Detail API Error ({ticker}): {e}")
        raise HTTPException(status_code=500, detail=str(e))


# [Endpoint] 현재가 단순 조회
@app.get("/price/{ticker}")
def get_stock_price(ticker: str):
    try:
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=5)).strftime("%Y%m%d")
        
        df_price = stock.get_market_ohlcv(start_date, end_date, ticker)
        if df_price.empty: raise HTTPException(status_code=404, detail="No Data")
        
        last_price = df_price.iloc[-1]
        
        change_amount = 0
        if len(df_price) > 1:
            prev_close = df_price['종가'].iloc[-2]
            change_amount = int(last_price['종가'] - prev_close)
        
        return {
            "ticker": ticker,
            "price": int(last_price['종가']),
            "change_rate": float(last_price['등락률']),
            "change_amount": change_amount
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 👇 전략 감시 시스템 (Batch Analysis) - 수정됨
# ==========================================
from pydantic import BaseModel
from typing import List, Dict, Any

class TickerList(BaseModel):
    tickers: List[str]

def calculate_rsi(df, period=14):
    delta = df['종가'].diff(1)
    gain = (delta.where(delta > 0, 0)).fillna(0)
    loss = (-delta.where(delta < 0, 0)).fillna(0)

    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1]

def analyze_ticker(ticker: str) -> Dict[str, Any]:
    now = datetime.now()
    today = now.strftime("%Y%m%d")
    start_date = (now - timedelta(days=60)).strftime("%Y%m%d")
    
    # 1. 시세 & RSI
    try:
        df = stock.get_market_ohlcv(start_date, today, ticker)
        if df.empty:
            return {"error": "No Data"}
        
        current_price = int(df['종가'].iloc[-1])
        open_price = int(df['시가'].iloc[-1])
        prev_close = int(df['종가'].iloc[-2]) if len(df) > 1 else current_price
        df = df.fillna(0)
        
        current_rsi = float(calculate_rsi(df, 14))
        if pd.isna(current_rsi): current_rsi = 50.0

        # =========================================================
        # 2. 투자자별 순매수 (하이브리드 로직)
        # =========================================================
        # Step 1: 기본값 (Pykrx - 확정 데이터)
        foreigner_net = 0
        institution_net = 0
        individual_net = 0
        data_source = "DAILY_CLOSE" 

        investor_data = get_valid_investor_data(ticker)
        if investor_data is not None:
            foreigner_net = int(investor_data.get('외국인', 0))
            institution_net = int(investor_data.get('기관합계', 0))
            individual_net = int(investor_data.get('개인', 0))

        # Step 2: 장중이고 캐시 데이터가 있으면 덮어쓰기 (Live 잠정치)
        is_market_open = (9 <= now.hour < 16)
        
        if is_market_open and (ticker in INVESTOR_CACHE):
            cached = INVESTOR_CACHE[ticker]
            foreigner_net = cached['foreigner']
            institution_net = cached['institution']
            individual_net = 0 # 잠정치는 개인 데이터 없음
            data_source = f"LIVE_EST({cached['time']})"
        # =========================================================

        # 3. 전략 판정
        alerts = []
        is_gap_up = open_price > prev_close
        is_opening_defended = current_price >= open_price
        
        if current_rsi <= 30.0:
            alerts.append({"code": "RSI_BUY", "level": "success", "message": f"매수 신호 (RSI {current_rsi:.1f})"})
        
        if foreigner_net < 0:
             alerts.append({"code": "FOREIGNER_SELL_WARN", "level": "warning", "message": "외국인 순매도 중"})

        if 12 <= now.hour < 14:
             if is_gap_up and (50 <= current_rsi <= 70) and (foreigner_net > 0):
                alerts.append({"code": "LUNCH_CHANCE", "level": "success", "message": "점심 찬스: 수급+갭상승"})

        if now.hour >= 14:
            if foreigner_net < 0: 
                 alerts.append({"code": "AFTERNOON_WARNING", "level": "warning", "message": "오후장 외국인 이탈 경고"})

        return {
            "price": current_price,
            "rsi": round(current_rsi, 1),
            "foreigner": foreigner_net,
            "institution": institution_net,
            "individual": individual_net,
            "is_gap_up": is_gap_up,
            "is_opening_defended": is_opening_defended,
            "alerts": alerts,
            "data_source": data_source
        }
    except Exception as e:
        print(f"Analysis error {ticker}: {e}")
        return {"error": str(e)}

@app.post("/strategy/batch")
def batch_strategy_analysis(payload: TickerList):
    results = {}
    print(f"Batch Analysis Request: {payload.tickers}")
    for ticker in payload.tickers:
        results[ticker] = analyze_ticker(ticker)
    return results

# ==========================================
# 🤖 AI Analyst (Gemini) Endpoints
# ==========================================
class StockInfo(BaseModel):
    name: str
    code: str

class AIAnalysisRequest(BaseModel):
    holdings: List[StockInfo]
    watchlist: List[StockInfo]

@app.post("/ai/analyze")
def trigger_ai_analysis(payload: AIAnalysisRequest):
    try:
        holdings_data = [{"name": h.name, "code": h.code} for h in payload.holdings]
        watchlist_data = [{"name": h.name, "code": h.code} for h in payload.watchlist]
        
        report = ai_analyst.generate_daily_report(holdings_data, watchlist_data)
        
        if "error" in report:
            raise HTTPException(status_code=500, detail=report["error"])
        
        conn = get_db_connection()
        cur = conn.cursor()
        today = datetime.now().date()
        cur.execute("""
            INSERT INTO daily_reports (date, content, created_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (date) DO UPDATE 
            SET content = EXCLUDED.content, created_at = NOW()
        """, (today, Json(report)))
        conn.commit()
        cur.close()
        conn.close()
        return report
    except Exception as e:
        print(f"AI Analysis trigger failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/latest")
def get_latest_ai_report():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT content FROM daily_reports ORDER BY date DESC LIMIT 1")
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row: return row[0]
        else: return {"message": "No reports found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# Watchlist Management
# ==========================================
class WatchlistAddRequest(BaseModel):
    ticker: str
    name: str

def get_realtime_price(ticker):
    try:
        stock = yf.Ticker(ticker if not ticker.isdigit() else f"{ticker}.KS")
        data = stock.history(period="1d")
        if not data.empty: return round(data['Close'].iloc[-1], 2)
    except: pass
    return 0

@app.get("/api/watchlist")
def get_watchlist():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT ticker, name FROM watchlist ORDER BY created_at DESC")
        items = cur.fetchall()
        result = []
        for ticker, name in items:
            price = get_realtime_price(ticker)
            result.append({"ticker": ticker, "name": name, "price": price})
        return result
    finally:
        cur.close()
        conn.close()

@app.post("/api/watchlist")
def add_to_watchlist(payload: WatchlistAddRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO watchlist (ticker, name) VALUES (%s, %s) ON CONFLICT (ticker) DO NOTHING",
            (payload.ticker, payload.name)
        )
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.delete("/api/watchlist/{ticker}")
def remove_from_watchlist(ticker: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM watchlist WHERE ticker = %s", (ticker,))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()