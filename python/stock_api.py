# stock_api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # 👈 필수 모듈
from pykrx import stock
from datetime import datetime, timedelta
import pandas as pd

app = FastAPI()

# ==========================================
# 👇 CORS 설정 (이 부분이 핵심입니다!)
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 모든 주소(*) 허용 (localhost, 127.0.0.1 등 모두 OK)
    allow_credentials=True,
    allow_methods=["*"],      # GET, POST 등 모든 방법 허용
    allow_headers=["*"],      # 모든 헤더 허용
)
# ==========================================

# ==========================================
# 🛠️ [Helper] 유효한 데이터 찾기 도우미 함수
# ==========================================
def get_valid_fundamental(ticker: str, retries=5):
    """
    오늘 날짜부터 과거로 거슬러 올라가며 
    PER/PBR 데이터가 '0이 아닌' 가장 최근 데이터를 찾습니다.
    """
    for i in range(retries):
        target_date = (datetime.now() - timedelta(days=i)).strftime("%Y%m%d")
        try:
            df = stock.get_market_fundamental_by_ticker(date=target_date, market="ALL")
            # 데이터가 있고, 해당 종목이 존재하며, PER가 0이 아니면 채택
            if not df.empty and ticker in df.index:
                # PBR이 0보다 크면 유효한 데이터로 간주 (PER는 적자기업일 경우 0일 수 있으나 PBR은 보통 있음)
                if df.loc[ticker, "PBR"] > 0:
                    return df.loc[ticker]
        except:
            continue
    return None

def get_valid_investor_data(ticker: str, retries=5):
    """
    오늘 날짜부터 과거로 거슬러 올라가며
    외국인/기관 수급 데이터가 있는 가장 최근 날짜를 찾습니다.
    """
    for i in range(retries):
        target_date = (datetime.now() - timedelta(days=i)).strftime("%Y%m%d")
        try:
            # 일자별 투자자 순매수 (하루치)
            df = stock.get_market_investor_net_purchase_by_date(target_date, target_date, ticker)
            if not df.empty:
                # 데이터가 전부 0이면(휴일 등) 패스, 값이 하나라도 있으면 리턴
                if df['외국인'].iloc[-1] != 0 or df['기관합계'].iloc[-1] != 0:
                    return df.iloc[-1]
        except:
            continue
    return None    

def get_latest_trading_data(ticker: str, days_to_look_back: int = 7):
    now = datetime.datetime.now()
    end_date = now.strftime("%Y%m%d")
    start_date = (now - datetime.timedelta(days=days_to_look_back)).strftime("%Y%m%d")
    return start_date, end_date

# [Heavy] 상세 정보 (최초 로딩, 날짜 변경 시 호출)
# stock_api.py 수정

def get_valid_fundamental(ticker: str, retries=10):
    """
    오늘 날짜부터 과거로 거슬러 올라가며 
    데이터가 존재하는 가장 최근 날짜의 펀더멘털을 찾습니다.
    """
    for i in range(retries):
        target_date = (datetime.now() - timedelta(days=i)).strftime("%Y%m%d")
        try:
            df = stock.get_market_fundamental_by_ticker(date=target_date, market="ALL")
            if not df.empty and ticker in df.index:
                row = df.loc[ticker]
                # DIV(배당수익률)이나 PBR 중 하나라도 데이터가 있으면 유효한 날짜로 간주
                if row['PBR'] > 0 or row['DIV'] > 0:
                    print(f"Found fundamental data for {ticker} on {target_date}")
                    return row
        except Exception as e:
            continue
    return None

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
        last_date = df_price.index[-1].strftime("%Y%m%d")
        
        # 2. 펀더멘컬 데이터 (pykrx 내부 오류 대응)
        per, pbr, div_yield = None, None, None
        try:
            fund_data = get_valid_fundamental(ticker)
            if fund_data is not None:
                per = float(fund_data['PER'])
                pbr = float(fund_data['PBR'])
                div_yield = float(fund_data['DIV'])
        except Exception as fe:
            print(f"Fundamental data scrape failed for {ticker}: {fe}")
        
        # 3. 시가총액
        market_cap = 0
        try:
            cap_df = stock.get_market_cap(last_date, last_date, ticker)
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


# [Light] 현재가 단순 조회 (3분 주기 호출)
@app.get("/price/{ticker}")
def get_stock_price(ticker: str):
    try:
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=5)).strftime("%Y%m%d")
        
        df_price = stock.get_market_ohlcv(start_date, end_date, ticker)
        if df_price.empty: raise HTTPException(status_code=404, detail="No Data")
        
        last_price = df_price.iloc[-1]
        
        return {
            "ticker": ticker,
            "price": int(last_price['종가']),
            "change_rate": float(last_price['등락률'])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 👇 전략 감시 시스템 (Batch Analysis)
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
    now = datetime.datetime.now()
    today = now.strftime("%Y%m%d")
    start_date = (now - datetime.timedelta(days=60)).strftime("%Y%m%d")
    
    # 1. 시세 & RSI
    # 1. 시세 & RSI
    try:
        df = stock.get_market_ohlcv(start_date, today, ticker)
        if df.empty:
            return {"error": "No Data"}
        
        current_price = int(df['종가'].iloc[-1])
        open_price = int(df['시가'].iloc[-1])
        prev_close = int(df['종가'].iloc[-2]) if len(df) > 1 else current_price
        df = df.fillna(0) # NaN 처리
        
        current_rsi = float(calculate_rsi(df, 14))
        if pd.isna(current_rsi): current_rsi = 50.0 # 기본값

        # 2. 투자자별 순매수 (외국인, 기관, 개인)
        foreigner_net = 0
        institution_net = 0
        individual_net = 0

        investor_data = get_valid_investor_data(ticker) # 헬퍼 함수 사용

        if investor_data is not None:
            # 컬럼명이 조금씩 다를 수 있어 .get() 사용
            foreigner_net = int(investor_data.get('외국인', 0))
            institution_net = int(investor_data.get('기관합계', 0))
            individual_net = int(investor_data.get('개인', 0))

        # 3. 전략 판정
        alerts = []
        is_gap_up = open_price > prev_close
        is_opening_defended = current_price >= open_price
        
        # 3-1. RSI 과매도 (매수 신호)
        if current_rsi <= 30.0:
            alerts.append({
                "code": "RSI_BUY",
                "level": "success", 
                "message": f"매수 신호 (RSI {current_rsi:.1f} 과매도)"
            })
        
        # 3-2. 외국인 매도 경고 (항시)
        if foreigner_net < 0:
             alerts.append({
                "code": "FOREIGNER_SELL_WARN",
                "level": "warning", 
                "message": "외국인 순매도 중"
            })

        # 3-3. 점심 찬스 (12~13시)
        # 조건: 갭상승 + RSI 55~65 + 외국인 매수 유지
        if 12 <= now.hour < 14: # 점심 시간대 (약간 넓게 잡음)
             if is_gap_up and (50 <= current_rsi <= 70) and (foreigner_net > 0):
                alerts.append({
                    "code": "LUNCH_CHANCE",
                    "level": "success",
                    "message": "점심 찬스: 추가 20주 매수 추천 (수급+갭상승)"
                })

        # 3-4. 오후장 수급 이탈 경고 (14시 이후)
        if now.hour >= 14:
            if foreigner_net < 0: # 외국인 이탈
                 alerts.append({
                    "code": "AFTERNOON_WARNING",
                    "level": "warning",
                    "message": "오후장 외국인 이탈 경고"
                })

        return {
            "price": current_price,
            "rsi": round(current_rsi, 1),
            "foreigner": foreigner_net,
            "institution": institution_net,
            "individual": individual_net,
            "is_gap_up": is_gap_up,
            "is_opening_defended": is_opening_defended,
            "alerts": alerts
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


@app.post("/strategy/batch")
def batch_strategy_analysis(payload: TickerList):
    results = {}
    print(f"Batch Analysis Request: {payload.tickers}")
    for ticker in payload.tickers:
        results[ticker] = analyze_ticker(ticker)
    return results

#=====원래 코드 +++
# @app.get("/price/{ticker}")
# def get_price(ticker: str):
#     now = datetime.datetime.now().strftime("%Y%m%d")
#     # pykrx로 실시간에 가까운 최신 종가 가져오기
#     df = stock.get_market_ohlcv(now, now, ticker)
    
#     if df.empty: # 장 시작 전이나 휴일 대응
#         prev_day = (datetime.datetime.now() - datetime.timedelta(days=5)).strftime("%Y%m%d")
#         df = stock.get_market_ohlcv(prev_day, now, ticker)

#     current_price = int(df['종가'].iloc[-1])
#     return {"ticker": ticker, "price": current_price}

# 실행: uvicorn stock_api:app --reload --port 8000


