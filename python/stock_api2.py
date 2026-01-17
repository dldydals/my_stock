from fastapi import FastAPI, HTTPException
from pykrx import stock
import datetime
import pandas as pd

app = FastAPI()

def get_latest_trading_data(ticker: str, days_to_look_back: int = 7):
    """
    최근 N일 간의 데이터를 조회하여 가장 최신(마지막 행) 데이터를 반환하는 헬퍼 함수
    주말/공휴일 대응을 위해 넉넉하게 조회 후 마지막 데이터를 사용합니다.
    """
    now = datetime.datetime.now()
    end_date = now.strftime("%Y%m%d")
    start_date = (now - datetime.timedelta(days=days_to_look_back)).strftime("%Y%m%d")
    
    return start_date, end_date

@app.get("/stock/{ticker}")
def get_stock_info(ticker: str):
    try:
        # 1. 날짜 범위 설정 (최근 7일 조회로 휴일/주말 완벽 대응)
        start_date, end_date = get_latest_trading_data(ticker)

        # 2. 시세 데이터 (OHLCV + 등락률)
        df_price = stock.get_market_ohlcv(start_date, end_date, ticker)
        if df_price.empty:
            raise HTTPException(status_code=404, detail="Invalid Ticker or No Data")
        
        last_price = df_price.iloc[-1] # 가장 최근 거래일 데이터

        # 3. 펀더멘털 데이터 (PER, PBR, 배당수익률 등)
        df_fund = stock.get_market_fundamental(start_date, end_date, ticker)
        last_fund = df_fund.iloc[-1]

        # 4. 시가총액 데이터 (시총, 상장주식수)
        df_cap = stock.get_market_cap(start_date, end_date, ticker)
        last_cap = df_cap.iloc[-1]

        # 5. 데이터 병합 및 반환 (JSON 직렬화를 위해 네이티브 타입으로 변환)
        return {
            "ticker": ticker,
            "date": df_price.index[-1].strftime("%Y-%m-%d"), # 기준 일자
            "price": int(last_price['종가']),
            "change_rate": float(last_price['등락률']), # 전일 대비 등락률 (%)
            
            # --- 추가된 펀더멘털 데이터 ---
            "per": float(last_fund['PER']) if last_fund['PER'] > 0 else 0.0,
            "pbr": float(last_fund['PBR']) if last_fund['PBR'] > 0 else 0.0,
            "dividend_yield": float(last_fund['DIV']), # 배당수익률
            
            # --- 추가된 시가총액 데이터 ---
            "market_cap": int(last_cap['시가총액']),
            "volume": int(last_price['거래량'])
        }

    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        # 에러 발생 시에도 서버가 죽지 않도록 예외 처리
        raise HTTPException(status_code=500, detail=str(e))

# 실행: uvicorn stock_api:app --reload --port 8000