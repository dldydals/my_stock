# stock_api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # 👈 필수 모듈
from pykrx import stock
import datetime
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

def get_latest_trading_data(ticker: str, days_to_look_back: int = 7):
    now = datetime.datetime.now()
    end_date = now.strftime("%Y%m%d")
    start_date = (now - datetime.timedelta(days=days_to_look_back)).strftime("%Y%m%d")
    return start_date, end_date

# [Heavy] 상세 정보 (최초 로딩, 날짜 변경 시 호출)
# stock_api.py 수정

@app.get("/stock/{ticker}")
def get_stock_detail(ticker: str):
    try:
        start_date, end_date = get_latest_trading_data(ticker)
        
        # 1. [필수] 시세 데이터 (이게 없으면 진짜 404)
        df_price = stock.get_market_ohlcv(start_date, end_date, ticker)
        if df_price.empty:
            print(f"🚨 Price Data Empty: {ticker}")
            raise HTTPException(status_code=404, detail="No Price Data")
        last_price = df_price.iloc[-1]
        
        # 2. [선택] 펀더멘털 데이터 (없어도 넘어가야 함)
        per, pbr, div_yield = 0.0, 0.0, 0.0
        try:
            df_fund = stock.get_market_fundamental(start_date, end_date, ticker)
            if not df_fund.empty:
                last_fund = df_fund.iloc[-1]
                per = float(last_fund['PER']) if 'PER' in last_fund and last_fund['PER'] > 0 else 0.0
                pbr = float(last_fund['PBR']) if 'PBR' in last_fund and last_fund['PBR'] > 0 else 0.0
                div_yield = float(last_fund['DIV']) if 'DIV' in last_fund else 0.0
        except Exception as e:
            print(f"⚠️ Fundamental Data Error (Ignored): {e}")

        # 3. [선택] 시가총액 데이터 (없어도 넘어가야 함)
        market_cap = 0
        try:
            df_cap = stock.get_market_cap(start_date, end_date, ticker)
            if not df_cap.empty:
                last_cap = df_cap.iloc[-1]
                market_cap = int(last_cap['시가총액'])
        except Exception as e:
             print(f"⚠️ Market Cap Data Error (Ignored): {e}")

        # 안전하게 수집된 데이터 반환
        return {
            "ticker": ticker,
            "date": df_price.index[-1].strftime("%Y-%m-%d"),
            "price": int(last_price['종가']),
            "change_rate": float(last_price['등락률']),
            "per": per,
            "pbr": pbr,
            "dividend_yield": div_yield,
            "market_cap": market_cap,
        }

    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        print(f"Detail API Critical Error ({ticker}): {e}")
        raise HTTPException(status_code=500, detail=str(e))


# [Light] 현재가 단순 조회 (3분 주기 호출)
@app.get("/price/{ticker}")
def get_stock_price(ticker: str):
    try:
        start_date, end_date = get_latest_trading_data(ticker)
        
        # 가장 기초적인 시세 데이터만 조회 (속도 최적화)
        df_price = stock.get_market_ohlcv(start_date, end_date, ticker)
        if df_price.empty: raise HTTPException(status_code=404, detail="No Data")
        
        last_price = df_price.iloc[-1]
        
        return {
            "ticker": ticker,
            "price": int(last_price['종가']),
            "change_rate": float(last_price['등락률'])
        }
    except Exception as e:
        print(f"Price API Error: {e}")
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
        try:
            # 일자별 투자자 순매수 (오늘 날짜)
            investor_df = stock.get_market_investor_net_purchase_by_date(today, today, ticker)
            if not investor_df.empty:
                # pykrx의 investor_df 컬럼: '기관합계', '기타법인', '개인', '외국인' 등
                # 최근 버전 컬럼명 확인 필요. 보통 '외국인', '기관합계', '개인' 존재.
                last_row = investor_df.iloc[-1]
                foreigner_net = int(last_row.get('외국인', 0))
                institution_net = int(last_row.get('기관합계', 0))
                individual_net = int(last_row.get('개인', 0))
        except Exception as inv_e:
            print(f"Investor data error {ticker}: {inv_e}")

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


