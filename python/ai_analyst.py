import os
import json
import re
import yfinance as yf
import FinanceDataReader as fdr
import google.generativeai as genai
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables (DATABASE_URL, GOOGLE_API_KEY)
load_dotenv()

from data_collector import get_market_data_json, get_naver_news_summary, get_holdings_price_data

# Google Gemini API Configuration
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class AIAnalyst:
    def __init__(self):
        # Use a stable and widely available model alias
        self.model = genai.GenerativeModel('gemini-flash-latest')

    def generate_daily_report(self, holdings_info, watchlist_info):
        """
        Main entry point to generate the AI report using advanced data collection.
        holdings_info: list of dicts with {'name': str, 'code': str}
        watchlist_info: list of dicts with {'name': str, 'code': str}
        """
        if not GEMINI_API_KEY:
            print("Error: GOOGLE_API_KEY is missing")
            return {"error": "GOOGLE_API_KEY not found in environment"}

        all_stocks = holdings_info + watchlist_info
        stock_names = [s['name'] for s in all_stocks]
        print(f"Starting advanced analysis for Portfolio ({len(holdings_info)}) and Watchlist ({len(watchlist_info)})...")
        
        # 1. Collect Data using the new modular collector
        try:
            market_data_json = get_market_data_json(years=3) # 3 years for deep context
            news_data_json = get_naver_news_summary(all_stocks)
            # CRITICAL: Fetch current prices to avoid hallucination
            price_data = get_holdings_price_data(all_stocks)
            holdings_price_json = json.dumps(price_data, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Data collection failed: {e}")
            return {"error": f"Data collection failed: {str(e)}"}

        # 2. Prepare the AI Prompt (Trading-Focused)
        prompt = f"""
        당신은 대한민국 주식 시장에서 최고의 승률을 자랑하는 **'단기 스윙 트레이더(Swing Trader)'**입니다.
        가치 투자 관점보다는, **철저한 기술적 분석과 단기 수급**을 기반으로 **3일~2주 내의 단기 매매 차익**을 극대화하는 전략을 제시하세요.

        [3개년 글로벌 시장 지표]
        {market_data_json}

        [분석 대상 종목 현재가 및 추세]
        {holdings_price_json}

        [최신 뉴스 및 재료]
        {news_data_json}

        [포트폴리오 현황]
        - 보유 중(Holdings): {', '.join([s['name'] for s in holdings_info])}
        - 관망 중(Watchlist): {', '.join([s['name'] for s in watchlist_info])}

        [💥 단기 트레이딩 분석 가이드라인 - 엄격 준수 💥]
        1. **단기 변동성 활용**: 기업의 장기 가치보다, **지금 당장의 '가격 위치'와 '단기 모멘텀'**에 집중하세요.
        2. **무조건적인 가격 제시**: 관망이나 홀딩 의견이라도, **"만약 단타로 진입한다면 유효한 기술적 타점"**을 반드시 계산해 내세요. (0원 금지)
        3. **매수/매도 로직 (Technical Levels)**:
           - **buy_price (진입/물타기 타점)**: 
             - 현재 추세에서 **기술적 반등(Rebound)**이 예상되는 **단기 지지선(Support Level)** 혹은 **20일/60일 이평선 눌림목** 가격.
             - 현재가보다 낮게 설정하여, 주가가 잠시 눌렸을 때 잡을 수 있는 가격.
           - **target_price (익절 타점)**: 
             - 단기적으로 부딪힐 수 있는 **1차 저항선(Resistance Level)** 또는 **전고점**.
             - 욕심내지 말고 실현 가능한 **+3% ~ +10% 구간**의 구체적인 가격.
           - **stop_loss (손절가)**:
             - 단기 추세가 무너지는 이탈 가격.

        [출력 형식 (JSON)]
        반드시 JSON 형식만 출력하세요. (설명 멘트 금지)
        {{
          "market_summary": "단기 시장 투심 및 섹터 수급 요약...",
          "daily_advice": "오늘의 단기 매매(단타/스윙) 대응 전략...",
          "holdings_analysis": [
            {{
              "name": "종목명",
              "outlook": "단기매수/홀딩/매도 중 택1",
              "analysis": "단기 차트 및 재료 분석 (수급 주체, 뉴스 반응 등)...",
              "buy_price": 0,
              "target_price": 0,
              "stop_loss": 0
            }}
          ],
          "watchlist_analysis": [
            {{
              "name": "종목명",
              "outlook": "단기매수/관망/제외 중 택1",
              "analysis": "신규 진입 시나리오...",
              "buy_price": 0,
              "target_price": 0,
              "stop_loss": 0
            }}
          ]
        }}
        """

        try:
            print("Sending request to Gemini AI (Advanced Mode)...")
            response = self.model.generate_content(prompt)
            
            # More robust JSON extraction using regex
            text = response.text.strip()
            json_match = re.search(r'(\{.*\})', text, re.DOTALL)
            if json_match:
                clean_text = json_match.group(1)
            else:
                clean_text = text.replace('```json', '').replace('```', '').strip()
                
            print("AI Report generated successfully.")
            return json.loads(clean_text)
        except Exception as e:
            print(f"AI Generation failed: {e}")
            if 'response' in locals() and hasattr(response, 'text'):
                print(f"Full AI Response was: {response.text}")
            return {"error": f"AI Generation failed: {str(e)}"}

if __name__ == "__main__":
    analyst = AIAnalyst()
    h = [{"name": "삼성전자", "code": "005930"}]
    w = [{"name": "카카오", "code": "035720"}]
    print(analyst.generate_daily_report(h, w))
