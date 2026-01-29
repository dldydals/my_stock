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

        # 2. Prepare the AI Prompt
        prompt = f"""
        당신은 상위 1% 투자 전략을 수립하는 대한민국 최고의 주식 애널리스트이자 '나만의 AI 개인 펀드매니저'입니다.
        아래 제공되는 실시간 데이터를 철저히 분석하여, 사용자를 위한 '보유 종목 관리' 및 '관심 종목 진입 전략' 리포트를 작성하세요.

        [3개년 글로벌 시장 지표 (JSON)]
        {market_data_json}

        [분석 대상 종목 현재가 및 1개월 수익률 (JSON)]
        {holdings_price_json}

        [분석 대상 종목 최신 뉴스 및 공시 (JSON)]
        {news_data_json}

        [보유 현황 (Holdings vs Watchlist)]
        - 보유 종목 (Holdings): {', '.join([s['name'] for s in holdings_info])}
        - 관심 종목 (Watchlist): {', '.join([s['name'] for s in watchlist_info])}

        [분석 가이드라인 - 매우 중요]
        1. **가격 앵커링 (Current Price Anchoring)**: 제공된 실시간 가격 데이터를 기준으로 삼으세요.
        2. **보유 종목 전략**: '이익 보존', '비중 조절', '중장기 보유' 등 현재 수익/손실 상황에서의 대응 방안을 제시하세요.
        3. **관심 종목 전략**: 매수 대기를 지시하거나, 특정 가격 도달 시 '신규 진입' 타점을 정교하게 산출하세요.
        4. **시장 인사이트**: 글로벌 기술주(AI/반도체) 및 거시 경제 흐름이 해당 종목들에 미칠 영향을 분석하세요.

        [출력 형식]
        반드시 아래의 JSON 형식을 지켜주세요. 텍스트 설명이나 코드 블록 기호 없이 순수 JSON만 출력하세요.
        {{
          "market_summary": "글로벌 시장 상황 및 수급 인사이트 요약...",
          "daily_advice": "오늘의 전체적인 투자 행동 지침...",
          "holdings_analysis": [
            {{
              "name": "종목명",
              "outlook": "호재/악재/중립",
              "analysis": "보유 종목으로서의 대응 시나리오 및 분석...",
              "buy_price": 0,
              "target_price": 0,
              "stop_loss": 0
            }}
          ],
          "watchlist_analysis": [
            {{
              "name": "종목명",
              "outlook": "호재/악재/중립",
              "analysis": "신규 진입 관점에서의 타점 및 분석...",
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
