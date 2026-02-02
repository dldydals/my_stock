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
import requests
from bs4 import BeautifulSoup
from io import StringIO
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

# ▼▼▼ [중요] Typing 모듈 임포트 (NameError 방지) ▼▼▼
from typing import List, Dict, Any 

# ▼▼▼ [이 줄이 빠져서 에러가 났습니다. 꼭 추가해주세요!] ▼▼▼
from pydantic import BaseModel
# ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

# 사용자 정의 모듈
import data_collector 
from ai_analyst import AIAnalyst

load_dotenv()

# =========================================================
# 💾 [Global Cache] & 📁 [File Persistence]
# =========================================================
CACHE_FILE = "investor_cache.json"
INVESTOR_CACHE = {}

def load_cache():
    global INVESTOR_CACHE
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                INVESTOR_CACHE = json.load(f)
            print(f"✅ [System] 캐시 파일 복구 완료: {len(INVESTOR_CACHE)}개 종목")
        except Exception as e:
            print(f"⚠️ [System] 캐시 파일 로드 실패: {e}")

def save_cache():
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(INVESTOR_CACHE, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"⚠️ [System] 캐시 저장 실패: {e}")

# =========================================================
# ⚡ [New] 초고속 실시간 현재가 (네이버 모바일 API)
# =========================================================
def get_realtime_price_naver(ticker):
    """네이버 금융 모바일 API에서 현재가만 0.1초 컷으로 가져옴"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        url = f"https://m.stock.naver.com/api/stock/{ticker}/basic"
        response = requests.get(url, headers=headers, timeout=1) # 1초 타임아웃
        data = response.json()
        
        if 'closePrice' in data:
            return {
                "price": int(data['closePrice'].replace(',', '')),
                "change_rate": float(data['fluctuationsRatio']),
                "change_amount": int(data['compareToPreviousClosePrice'].replace(',', ''))
            }
    except:
        pass
    return None



def update_all_investor_data():
    """스케줄러 잡: DB에 있는 모든 종목의 수급 데이터 갱신"""
    target_tickers = set()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Watchlist와 보유종목 모두 긁어오기
        cur.execute("SELECT ticker FROM watchlist UNION SELECT ticker FROM daily_stock_prices GROUP BY ticker")
        for row in cur.fetchall():
            target_tickers.add(row[0])
        cur.close()
        conn.close()
    except:
        pass

    updated = False
    print(f"⏰ [Scheduler] 수급 데이터 갱신 시작 ({len(target_tickers)}개 종목)")
    
    for ticker in target_tickers:
        # ▼▼▼ [수정] 함수 이름을 최신 버전으로 변경했습니다! ▼▼▼
        data = get_investor_from_naver_api(ticker) 
        # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        if data:
            INVESTOR_CACHE[ticker] = data
            updated = True
            
    if updated: 
        save_cache()
        print("✅ [Scheduler] 수급 데이터 갱신 완료 및 저장")

# =========================================================
# 🚀 [Lifespan] 서버 시작/종료 관리
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_cache()
    scheduler = BackgroundScheduler()
    scheduler.add_job(update_all_investor_data, 'interval', minutes=10)
    scheduler.start()
    scheduler.add_job(update_all_investor_data) # 시작하자마자 한 번 실행
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
ai_analyst = AIAnalyst()

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url: raise Exception("DATABASE_URL missing")
    if "?" in db_url: db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ⚡ [Endpoint] 현재가 조회 (네이버 API로 최적화)
# =========================================================
@app.get("/price/{ticker}")
def get_stock_price(ticker: str):
    try:
        # 1. Fast Path
        realtime_data = get_realtime_price_naver(ticker)
        if realtime_data:
            return {
                "ticker": ticker,
                "price": realtime_data['price'],
                "change_rate": realtime_data['change_rate'],
                "change_amount": realtime_data['change_amount']
            }

        # 2. Fallback (Yfinance)
        stock_yf = yf.Ticker(f"{ticker}.KS")
        data = stock_yf.history(period="1d", interval="1m")
        if data.empty:
            stock_yf = yf.Ticker(f"{ticker}.KQ")
            data = stock_yf.history(period="1d", interval="1m")

        if not data.empty:
            last = data.iloc[-1]
            return {
                "ticker": ticker,
                "price": int(last['Close']),
                "change_rate": 0.0,
                "change_amount": 0
            }
        raise HTTPException(status_code=404, detail="No Data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# 🧠 [Core Logic] 전략 분석 (Lazy Load + Pykrx Fix)
# =========================================================
def calculate_rsi(df, period=14):
    try:
        delta = df['종가'].diff(1)
        gain = (delta.where(delta > 0, 0)).fillna(0)
        loss = (-delta.where(delta < 0, 0)).fillna(0)
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]
    except:
        return 50.0

# =========================================================
# 🕵️‍♂️ [Secret] 네이버 모바일 JSON API (차단 우회용)
# =========================================================
# python/stock_api.py 내부 함수 교체

# python/stock_api.py 내부 함수

def get_investor_from_naver_api(ticker: str):
    """
    [Final] HTML 직접 파싱 방식 + 개인 수급 역산
    """
    try:
        url = f"https://finance.naver.com/item/frgn.naver?code={ticker}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Referer': 'https://finance.naver.com/'
        }
        
        response = requests.get(url, headers=headers, timeout=3)
        html = response.content.decode('euc-kr', 'replace')
        soup = BeautifulSoup(html, 'html.parser')
        
        tables = soup.find_all("table", class_="type2")
        target_table = None
        
        for table in tables:
            if "기관" in table.text and "외국인" in table.text and len(table.find_all("tr")) > 10:
                target_table = table
                break
        
        if target_table:
            df = pd.read_html(StringIO(str(target_table)))[0]
            df = df.dropna(how='all')
            df = df[df.iloc[:, 0].str.match(r'\d{4}\.\d{2}\.\d{2}', na=False)]
            
            if not df.empty:
                latest = df.iloc[0] 
                date_str = str(latest.iloc[0])
                
                def safe_int(val):
                    try:
                        if isinstance(val, str): return int(val.replace(',', ''))
                        return int(val)
                    except: return 0

                i_val = safe_int(latest.iloc[5]) # 기관
                f_val = safe_int(latest.iloc[6]) # 외국인
                
                # ▼▼▼ [추가] 개인 수급 역산 (개인 ≈ -(기관 + 외국인)) ▼▼▼
                p_val = -(i_val + f_val)
                # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
                
                print(f"✅ [HTML Parse] {ticker} ({date_str}) -> 외인:{f_val}, 기관:{i_val}, 개인(추정):{p_val}")
                
                return {
                    "foreigner": f_val,
                    "institution": i_val,
                    "individual": p_val, # 이제 계산된 값이 나갑니다!
                    "date_str": f"Close({date_str[5:]})"
                }
                
    except Exception as e:
        print(f"⚠️ [Parse Fail] HTML 파싱 실패: {e}")
    return None

# =========================================================
# 🧠 [Core Logic] 분석 함수 (Pykrx 제거 -> API 교체)
# =========================================================
def analyze_ticker(ticker: str) -> Dict[str, Any]:
    """개별 종목 정밀 분석 (JSON API 활용)"""
    now = datetime.now()
    
    # 1. 수급 데이터 가져오기 (우선순위: 캐시 > 네이버 JSON API)
    #    KRX(Pykrx)는 차단되었으므로 제거했습니다.
    foreigner_net = 0
    institution_net = 0
    individual_net = 0
    data_source = "None"
    
    # (1) 캐시 확인
    if ticker in INVESTOR_CACHE:
        cached = INVESTOR_CACHE[ticker]
        foreigner_net = cached.get('foreigner', 0)
        institution_net = cached.get('institution', 0)
        # [NEW] 이 줄이 없어서 계속 0으로 나갔던 겁니다!
        individual_net = cached.get('individual', 0)
        data_source = f"Live({cached.get('time', '')})"
    else:
        # (2) 캐시 없으면 -> 네이버 JSON API 호출 (New!)
        api_data = get_investor_from_naver_api(ticker)
        if api_data:
            foreigner_net = api_data['foreigner']
            institution_net = api_data['institution']
            individual_net = api_data.get('individual', 0)
            data_source = api_data['date_str']
            
            # API 성공했으면 캐시에도 살짝 저장해둠 (다음 요청 빠르게)
            INVESTOR_CACHE[ticker] = {
                'foreigner': foreigner_net,
                'institution': institution_net,
                'time': data_source
            }

    # 2. RSI 계산 (기존 로직 유지)
    start_date_rsi = (now - timedelta(days=60)).strftime("%Y%m%d")
    end_date_rsi = now.strftime("%Y%m%d")
    current_rsi = 50.0
    price_data = {}
    
    try:
        # RSI용 가격 데이터 (yfinance가 더 안전할 수 있음, 일단 pykrx 유지하되 실패시 방어)
        df = stock.get_market_ohlcv(start_date_rsi, end_date_rsi, ticker)
        if df is None or df.empty:
            # Pykrx 차단시 yfinance로 백업 시도
             yf_ticker = f"{ticker}.KS"
             df_yf = yf.download(yf_ticker, start=(now-timedelta(days=60)), progress=False)
             if not df_yf.empty:
                 # yfinance 데이터 구조 맞추기
                 df = pd.DataFrame()
                 df['종가'] = df_yf['Close']
                 df['시가'] = df_yf['Open']

        if df is not None and not df.empty:
            df = df.fillna(0)
            current_rsi = float(calculate_rsi(df, 14))
            if pd.isna(current_rsi): current_rsi = 50.0
            
            # 종가/시가 처리
            try:
                current_price = int(df['종가'].iloc[-1])
                open_price = int(df['시가'].iloc[-1])
                prev_close = int(df['종가'].iloc[-2]) if len(df) > 1 else current_price
            except:
                # yfinance Series 처리
                current_price = int(df['종가'].iloc[-1].item()) if hasattr(df['종가'].iloc[-1], 'item') else int(df['종가'].iloc[-1])
                open_price = int(df['시가'].iloc[-1].item())
                prev_close = int(df['종가'].iloc[-2].item())
            
            price_data = {
                "price": current_price,
                "is_gap_up": open_price > prev_close,
                "is_opening_defended": current_price >= open_price
            }
    except Exception as e:
        print(f"RSI Calc Error: {e}")

    # 3. 전략 판정
    alerts = []
    if current_rsi <= 30.0:
        alerts.append({"code": "RSI_BUY", "level": "success", "message": f"매수 신호 (RSI {current_rsi:.1f})"})
    elif current_rsi >= 70.0:
        alerts.append({"code": "RSI_SELL", "level": "warning", "message": f"과열 구간 (RSI {current_rsi:.1f})"})
    
    if foreigner_net > 0 and institution_net > 0:
        alerts.append({"code": "TWINS_BUY", "level": "error", "message": "외인/기관 쌍끌이"})

    print(f"🚀 [Return] {ticker} -> 외인:{foreigner_net}, 기관:{institution_net}, 소스:{data_source}")

    return {
        "ticker": ticker,
        "rsi": round(current_rsi, 1),
        "foreigner": foreigner_net,
        "institution": institution_net,
        "individual": individual_net,
        "alerts": alerts,
        "data_source": data_source,
        **price_data
    }

# =========================================================
# 📡 [Endpoints] 배치 분석 & AI 리포트
# =========================================================
class TickerList(BaseModel):
    tickers: List[str]

@app.post("/strategy/batch")
def batch_strategy_analysis(payload: TickerList):
    results = {}
    print(f"🧠 [Strategy] 배치 분석 요청: {len(payload.tickers)}개 종목")
    for ticker in payload.tickers:
        results[ticker] = analyze_ticker(ticker)
    return results

class StockInfo(BaseModel):
    name: str
    code: str

class AIAnalysisRequest(BaseModel):
    holdings: List[StockInfo]
    watchlist: List[StockInfo]
# ... (상단 import 생략)

# 1. 요청 모델에 '강제 업데이트 여부' 플래그 추가
class AIAnalysisRequest(BaseModel):
    holdings: List[StockInfo]
    watchlist: List[StockInfo]
    force_update: bool = False  # 👈 기본값 False: DB에 있으면 그거 씀

@app.post("/analysis/report")
def get_ai_report_with_collection(payload: AIAnalysisRequest):
    conn = None
    try:
        print(f"🔄 [System] 통합 분석 요청 수신")
        
        # ---------------------------------------------------------
        # 1. [DB Check] 오늘 이미 생성된 리포트가 있는지 확인
        # ---------------------------------------------------------
        today = datetime.now().date()
        conn = get_db_connection()
        cur = conn.cursor()
        
        if not payload.force_update:
            try:
                cur.execute("SELECT content FROM daily_reports WHERE date = %s", (today,))
                row = cur.fetchone()
                if row:
                    print(f"✅ [Cache] 오늘({today}) 리포트가 이미 존재함 -> DB 데이터 반환")
                    cur.close()
                    conn.close()
                    return row[0] # AI 호출 없이 바로 리턴! (Quota 절약)
            except Exception as e:
                print(f"⚠️ DB 조회 중 오류 (무시하고 진행): {e}")
                conn.rollback()
        
        # ---------------------------------------------------------
        # 2. [Generation] 없거나 강제 업데이트면 -> AI 분석 시작
        # ---------------------------------------------------------
        print("🧠 [AI Analyst] DB에 없음 -> 정밀 분석 시작...")
        
        # 데이터 수집
        holdings_list = [{"name": h.name, "code": h.code} for h in payload.holdings]
        watchlist_list = [{"name": h.name, "code": h.code} for h in payload.watchlist]
        all_targets = holdings_list + watchlist_list

        if all_targets:
            # print(f"📥 [Data Collector] 데이터 최신화 시작...")
            data_collector.fetch_and_save_data(all_targets)

        # AI 호출 (Quota Exceeded 방어)
        try:
            report = ai_analyst.generate_daily_report(holdings_list, watchlist_list)
        except Exception as ai_e:
            print(f"⚠️ [AI Error] {ai_e}")
            if conn: conn.close()
            return {
                "date": str(today),
                "daily_advice": "⚠️ AI 사용량이 많아 잠시 쉬고 있습니다. (Quota Exceeded)",
                "holdings_analysis": [],
                "error": "QUOTA_EXCEEDED"
            }
        
        if "error" in report:
            if conn: conn.close()
            raise HTTPException(status_code=500, detail=report["error"])
        
        # 3. [Save] 생성된 리포트를 DB에 저장
        try:
            # 커서는 위에서 닫혔을 수도 있으므로 재확인
            if conn.closed: conn = get_db_connection()
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO daily_reports (date, content, created_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (date) DO UPDATE 
                SET content = EXCLUDED.content, created_at = NOW()
            """, (today, Json(report)))
            conn.commit()
            print("💾 [DB Save] 신규 리포트 저장 완료")
        except Exception as e: 
            print(f"❌ DB 저장 실패: {e}")
            conn.rollback()
        finally:
            cur.close()
            conn.close()

        return report

    except Exception as e:
        print(f"❌ 통합 분석 실패: {e}")
        if conn and not conn.closed: conn.close()
        return {"error": str(e), "daily_advice": "시스템 오류"}

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
# Watchlist / Stock Detail (기존 유지)
# ==========================================
class WatchlistAddRequest(BaseModel):
    ticker: str
    name: str

@app.get("/api/watchlist")
def get_watchlist():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT ticker, name FROM watchlist ORDER BY created_at DESC")
        items = cur.fetchall()
        result = []
        for ticker, name in items:
            data = get_realtime_price_naver(ticker)
            price = data['price'] if data else 0
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
        cur.execute("INSERT INTO watchlist (ticker, name) VALUES (%s, %s) ON CONFLICT (ticker) DO NOTHING", (payload.ticker, payload.name))
        conn.commit()
        return {"status": "success"}
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
    finally:
        cur.close()
        conn.close()

# ... (이외 상세 정보 함수 get_stock_detail 등은 필요시 유지) ...
def get_valid_fundamental(ticker: str, retries=5):
    for i in range(retries):
        target_date = (datetime.now() - timedelta(days=i)).strftime("%Y%m%d")
        try:
            df = stock.get_market_fundamental_by_ticker(date=target_date, market="ALL")
            if not df.empty and ticker in df.index:
                return df.loc[ticker]
        except: continue
    return None

@app.get("/stock/{ticker}")
def get_stock_detail(ticker: str):
    try:
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=10)).strftime("%Y%m%d")
        
        df_price = stock.get_market_ohlcv(start_date, end_date, ticker)
        if df_price.empty: raise HTTPException(status_code=404)
        
        last_price = df_price.iloc[-1]
        
        per, pbr, div = None, None, None
        fund = get_valid_fundamental(ticker)
        if fund is not None:
            per = float(fund['PER'])
            pbr = float(fund['PBR'])
            div = float(fund['DIV'])

        market_cap = 0
        try:
            cap_df = stock.get_market_cap(end_date, end_date, ticker)
            if not cap_df.empty and ticker in cap_df.index:
                market_cap = int(cap_df.loc[ticker, "시가총액"])
        except: pass

        return {
            "ticker": ticker,
            "date": df_price.index[-1].strftime("%Y-%m-%d"),
            "price": int(last_price['종가']),
            "change_rate": float(last_price['등락률']),
            "per": per, "pbr": pbr, "dividend_yield": div,
            "market_cap": market_cap,
            "data_source_status": "OK"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))