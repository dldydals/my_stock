# stock_api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import FinanceDataReader as fdr
from pykrx import stock
from datetime import datetime, timedelta
import pandas as pd
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🧠 [Memory] 메모리 캐시 저장소
# ==========================================
# 구조: { "005930": { "per": 10.5, "pbr": 1.2, "cap": 500000... } }
STOCK_CACHE = {} 

# ==========================================
# 🛠️ 크롤링 및 데이터 수집 함수들
# ==========================================
def scrape_naver_finance(ticker: str):
    """ 네이버 금융 직접 크롤링 (최후의 수단) """
    try:
        url = f"https://finance.naver.com/item/main.naver?code={ticker}"
        response = requests.get(url)
        if response.status_code != 200: return None
        soup = BeautifulSoup(response.text, 'html.parser')
        
        def get_text_by_id(element_id):
            el = soup.select_one(f"#{element_id}")
            if el:
                text = el.text.replace(',', '').replace('%', '').strip()
                return float(text) if text else 0.0
            return 0.0

        return {
            "per": get_text_by_id("_per"),
            "pbr": get_text_by_id("_pbr"),
            "div_yield": get_text_by_id("_dvr"),
            "market_cap": 0 # 시총은 복잡해서 생략 (FDR이 보통 잘 가져옴)
        }
    except:
        return None

def get_fundamental_data(ticker: str):
    """
    PER, PBR 등 '안 변하는 데이터'를 가져옵니다.
    1. FDR 시도 -> 2. 실패시 네이버 크롤링
    """
    data = {"per": 0.0, "pbr": 0.0, "div_yield": 0.0, "market_cap": 0}
    
    # 1. FDR 시도
    try:
        df = fdr.StockListing('KRX')
        target = df[df['Code'] == ticker]
        if not target.empty:
            item = target.iloc[0]
            data["per"] = float(item['PER']) if pd.notna(item.get('PER')) else 0.0
            data["pbr"] = float(item['PBR']) if pd.notna(item.get('PBR')) else 0.0
            data["div_yield"] = float(item['DividendYield']) if pd.notna(item.get('DividendYield')) else 0.0
            data["market_cap"] = int(item['Marcap']) if pd.notna(item.get('Marcap')) else 0
    except:
        pass

    # 2. 0이면 네이버 크롤링으로 보완
    if data["per"] == 0 or data["pbr"] == 0:
        print(f"⚠️ [Cache Miss] {ticker} 데이터 부족. 네이버 크롤링 시도...")
        naver_data = scrape_naver_finance(ticker)
        if naver_data:
            if data["per"] == 0: data["per"] = naver_data["per"]
            if data["pbr"] == 0: data["pbr"] = naver_data["pbr"]
            if data["div_yield"] == 0: data["div_yield"] = naver_data["div_yield"]
    
    return data

def get_current_price(ticker: str):
    """
    현재가(Price)는 매번 변하므로 별도로 가져옵니다. (캐싱 X)
    """
    try:
        # FDR 리스팅이 가장 빠름 (전체 리스트 메모리에 로드)
        df = fdr.StockListing('KRX') 
        target = df[df['Code'] == ticker]
        if not target.empty:
            item = target.iloc[0]
            return {
                "price": int(item['Close']) if pd.notna(item['Close']) else 0,
                "change_rate": float(item['ChagesRatio']) if pd.notna(item['ChagesRatio']) else 0.0
            }
    except:
        pass
    return {"price": 0, "change_rate": 0.0}

def get_safe_investor_data(ticker: str):
    # 오늘부터 5일 전까지 뒤져서 수급 데이터 찾는 함수
    for i in range(5):
        target_date = (datetime.now() - timedelta(days=i)).strftime("%Y%m%d")
        try:
            df = stock.get_market_investor_net_purchase_by_date(target_date, target_date, ticker)
            if not df.empty:
                # 0이 아닌 유효 데이터 발견 시 리턴
                if df['외국인'].iloc[-1] != 0 or df['기관합계'].iloc[-1] != 0:
                    return {
                        "foreigner": int(df['외국인'].iloc[-1]),
                        "institution": int(df['기관합계'].iloc[-1]),
                        "individual": int(df['개인'].iloc[-1])
                    }
        except:
            continue
    # 실패 시 0 리턴
    return {"foreigner": 0, "institution": 0, "individual": 0}

# ==========================================
# 📡 API Endpoints
# ==========================================

# 기존 import 문 아래에 이 함수가 정의되어 있어야 합니다.
# (이전 답변의 get_safe_investor_data 함수 사용)

@app.get("/stock/{ticker}")
def get_stock_detail(ticker: str):
    try:
        # 1. [Dynamic] 현재가 (실시간, 캐싱 X)
        price_info = get_current_price(ticker)
        
        # 2. [Static] 펀더멘털 (캐싱 O)
        if ticker in STOCK_CACHE:
            print(f"⚡ [Cache Hit] {ticker} 펀더멘털 데이터")
            fund_data = STOCK_CACHE[ticker]
        else:
            print(f"🐢 [Cache Miss] {ticker} 펀더멘털 새로 수집")
            fund_data = get_fundamental_data(ticker)
            if fund_data['per'] != 0 or fund_data['pbr'] != 0:
                STOCK_CACHE[ticker] = fund_data

        # 3. [Dynamic] 외국인/기관 수급 (Pykrx 사용, 실시간 변동 가능성 있음)
        #    -> FDR에는 이 기능이 없어서 pykrx를 써야 합니다.
        investor_data = get_safe_investor_data(ticker)
        
        # 만약 수급 데이터가 None이면 0으로 채움
        if investor_data is None:
            investor_data = {"foreigner": 0, "institution": 0, "individual": 0}

        return {
            "ticker": ticker,
            "date": datetime.now().strftime("%Y-%m-%d"),
            
            # 시세 정보
            "price": price_info['price'],
            "change_rate": price_info['change_rate'],
            
            # 펀더멘털 정보 (캐싱됨)
            "per": fund_data['per'],
            "pbr": fund_data['pbr'],
            "dividend_yield": fund_data['div_yield'],
            "market_cap": fund_data['market_cap'],
            
            # 👇 [여기가 추가된 부분입니다] 수급 정보
            "foreigner_net": investor_data['foreigner'],   # 외국인 순매수
            "institution_net": investor_data['institution'], # 기관 순매수
            "individual_net": investor_data['individual'],   # 개인 순매수
        }

    except Exception as e:
        print(f"API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# [Light] 현재가 단순 조회
@app.get("/price/{ticker}")
def get_stock_price(ticker: str):
    try:
        # FDR StockListing 사용 (가장 안정적)
        info = get_fdr_info(ticker)
        if info is None: 
            raise HTTPException(status_code=404, detail="No Data")
        
        return {
            "ticker": ticker,
            "price": info['price'],
            "change_rate": info['change_rate']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 👇 전략 감시 시스템 (Batch Analysis)
# ==========================================

class TickerList(BaseModel):
    tickers: List[str]

def calculate_rsi(df, period=14):
    # RSI 계산 로직
    delta = df['Close'].diff(1) # FDR 컬럼명은 Close (종가)
    gain = (delta.where(delta > 0, 0)).fillna(0)
    loss = (-delta.where(delta < 0, 0)).fillna(0)

    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1]

def analyze_ticker(ticker: str) -> Dict[str, Any]:
    try:
        # 1. 시세 & RSI (FDR 사용)
        #    -> pykrx보다 차트 데이터 가져오는 속도가 빠름
        #    -> 60일치 데이터 요청
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90) # 넉넉하게
        
        df = fdr.DataReader(ticker, start_date, end_date)
        
        if df.empty:
            return {"error": "No Data"}
        
        current_price = int(df['Close'].iloc[-1])
        open_price = int(df['Open'].iloc[-1])
        prev_close = int(df['Close'].iloc[-2]) if len(df) > 1 else current_price
        
        df = df.fillna(0)
        current_rsi = float(calculate_rsi(df, 14))
        if pd.isna(current_rsi): current_rsi = 50.0

        # 2. 투자자별 순매수 (pykrx 사용 - FDR 미지원)
        foreigner_net = 0
        institution_net = 0
        individual_net = 0
        
        investor_data = get_safe_investor_data(ticker)
        if investor_data is not None:
            foreigner_net = int(investor_data.get('외국인', 0))
            institution_net = int(investor_data.get('기관합계', 0))
            individual_net = int(investor_data.get('개인', 0))

        # 3. 전략 판정
        alerts = []
        is_gap_up = open_price > prev_close
        is_opening_defended = current_price >= open_price
        now_hour = datetime.now().hour
        
        # 3-1. RSI 과매도
        if current_rsi <= 30.0:
            alerts.append({"code": "RSI_BUY", "level": "success", "message": f"매수 신호 (RSI {current_rsi:.1f} 과매도)"})
        
        # 3-2. 외국인 매도 경고
        if foreigner_net < 0:
             alerts.append({"code": "FOREIGNER_SELL_WARN", "level": "warning", "message": "외국인 순매도 중"})

        # 3-3. 점심 찬스 (12~13시)
        if 12 <= now_hour < 14:
             if is_gap_up and (50 <= current_rsi <= 70) and (foreigner_net > 0):
                alerts.append({"code": "LUNCH_CHANCE", "level": "success", "message": "점심 찬스 (수급+갭상승)"})

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

# 실행 명령어: uvicorn stock_api:app --reload --port 8000