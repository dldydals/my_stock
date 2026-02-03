import os
import json
import requests
import google.generativeai as genai
from datetime import datetime
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

class AIAnalyst:
    def __init__(self):
        # 1. API 키 확인
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("⚠️ [AI Init] API Key가 없습니다. .env 파일을 확인하세요.")
            return
        
        genai.configure(api_key=api_key)

        # 2. [핵심] AI에게 "2026년 현재 상황"과 "가격 신뢰"를 강제하는 시스템 프롬프트
        system_instruction = """
You are a professional stock trader (Quant) in **February 2026**.
Your goal is to provide a JSON daily strategy report.

[CRITICAL RULES]
1. **Trust Input Price**: The 'Current Price' provided in the user prompt is the **ABSOLUTE TRUTH**. 
   - Even if your memory says "SK Square is 80,000 KRW", you MUST accept the input price (e.g., 525,000 KRW) as fact.
   - Calculate Target Price (+2~5%) and Stop Loss (-2~3%) based on the **Input Price**.
2. **Analysis Logic**:
   - RSI < 30: Buy Signal (Oversold).
   - RSI > 70: Sell Signal (Overbought).
3. **Output Format**: Return ONLY valid JSON. No Markdown.

[JSON Structure]
{
  "date": "YYYY-MM-DD",
  "daily_advice": "Market summary in Korean",
  "holdings_analysis": [
    {
      "name": "Stock Name",
      "code": "Ticker",
      "current_price": 12345,
      "outlook": "긍정/중립/부정",
      "analysis": "Reason in Korean",
      "strategy": "BUY/SELL/HOLD",
      "buy_price": 12000,
      "target_price": 13000,
      "stop_loss": 11000
    }
  ],
  "watchlist_analysis": [ ...same... ]
}
"""
        # 3. 모델 초기화 (Gemini 1.5 Flash 사용)
        try:
            self.model = genai.GenerativeModel(
                'gemini-2.0-flash',
                system_instruction=system_instruction
            )
            print("🤖 [AI Init] Gemini 1.5 Flash 모델 로드 완료 (System Instruction 적용됨)")
        except Exception as e:
            print(f"❌ [AI Init] 모델 초기화 실패: {e}")

    def _fetch_realtime_price(self, ticker):
        """AI에게 알려줄 '진짜 가격'을 네이버에서 직접 가져옵니다."""
        try:
            url = f"https://m.stock.naver.com/api/stock/{ticker}/basic"
            res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=2)
            data = res.json()
            if 'closePrice' in data:
                return int(data['closePrice'].replace(',', ''))
        except:
            pass
        return 0

    def generate_daily_report(self, holdings_list, watchlist_list):
        """
        [수정됨] 텍스트가 아닌 'JSON 데이터' 형태로 질문하여 
        AI가 종목을 헷갈리는(정보 섞임) 현상을 원천 차단합니다.
        """
        if not hasattr(self, 'model'):
            return {"error": "AI Model not initialized"}

        print("🧠 [AI Analyst] 데이터 구조화 및 분석 요청 중...")

        # 1. AI에게 보낼 데이터를 '리스트'로 깔끔하게 정리
        input_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "task": "Analyze these stocks based on the provided 'current_price'.",
            "stocks": []
        }

        # 보유 종목 데이터화
        for h in holdings_list:
            price = self._fetch_realtime_price(h['code'])
            input_data["stocks"].append({
                "category": "HOLDING",
                "name": h['name'],
                "code": h['code'],
                "current_price": price # 실시간 가격
            })

        # 관심 종목 데이터화
        for w in watchlist_list:
            price = self._fetch_realtime_price(w['code'])
            input_data["stocks"].append({
                "category": "WATCHLIST",
                "name": w['name'],
                "code": w['code'],
                "current_price": price # 실시간 가격
            })

        # 2. 프롬프트 작성 (JSON을 문자열로 변환해서 던짐)
        # 이렇게 하면 AI가 "아, 이건 데이터구나" 하고 정확하게 인식합니다.
        prompt_text = f"""
[DATA_TO_ANALYZE]
{json.dumps(input_data, ensure_ascii=False, indent=2)}

[INSTRUCTION]
1. Analyze each stock in the 'stocks' list individually.
2. **DO NOT MIX UP DATA.** The analysis for 'SK Square' must use 'SK Square's price.
3. Return the result in the standard JSON format defined in the system instruction.
"""

        # 3. AI 호출
        try:
            response = self.model.generate_content(prompt_text)
            text = response.text.strip()
            
            if text.startswith("```json"): text = text[7:]
            if text.endswith("```"): text = text[:-3]
            
            return json.loads(text)

        except Exception as e:
            print(f"⚠️ [AI Error] {e}")
            return {
                "date": datetime.now().strftime("%Y-%m-%d"),
                "daily_advice": "분석 중 오류 발생",
                "holdings_analysis": [],
                "error": str(e)
            }