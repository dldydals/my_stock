import sys
import os
import warnings

# 현재 폴더 경로 추가 (안전장치)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 경고 메시지 끄기
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

import json
import re
from dotenv import load_dotenv
import google.generativeai as genai

# 우리가 만든 모듈 가져오기 (핵심!)
import analyzer
import data_collector


# 환경 변수 로드
load_dotenv()
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class AIAnalyst:
    def __init__(self):
        #self.model = genai.GenerativeModel('gemini-flash-latest') # 또는 gemini-1.5-flash
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def _get_market_summary(self):
        """시장 지수(나스닥, 환율)의 기술적 분석 현황을 가져옵니다."""
        indices = {
            "나스닥": "^IXIC",
            "원달러환율": "KRW=X"
        }
        summary_text = ""
        for name, ticker in indices.items():
            data = analyzer.get_technical_summary(ticker)
            if data:
                summary_text += f"- {name}: RSI {data['rsi']} ({data['rsi_status']}), 추세: {data['sma_status']}\n"
        return summary_text

    def generate_daily_report(self, holdings_info, watchlist_info):
        """
        보유/관심 종목에 대해 DB 기반 정밀 분석 리포트를 생성합니다.
        """
        if not GEMINI_API_KEY:
            return {"error": "GOOGLE_API_KEY가 없습니다."}

        print("🧠 AI 분석 시작 (DB 데이터 기반)...")

        # 1. AI에게 보낼 종목별 분석 데이터 취합
        # analyzer.create_ai_prompt()를 사용하여 "이미 계산된" 정보를 가져옵니다.
        
        holdings_prompts = []
        for stock in holdings_info:
            report = analyzer.create_ai_prompt(stock['code'])
            holdings_prompts.append(f"--- [보유 종목: {stock['name']}] ---\n{report}")

        watchlist_prompts = []
        for stock in watchlist_info:
            report = analyzer.create_ai_prompt(stock['code'])
            watchlist_prompts.append(f"--- [관심 종목: {stock['name']}] ---\n{report}")

        # 시장 요약 가져오기
        market_summary = self._get_market_summary()

        # 2. 최종 프롬프트 조립
        final_prompt = f"""
        당신은 최고의 승률을 자랑하는 **'단기 스윙 트레이더'**입니다.
        아래 제공된 **'기술적 분석 리포트(RSI, 이평선)'**와 **'최근 30일 차트 패턴'**을 보고 매매 전략을 수립하세요.
        
        [시장 현황]
        {market_summary}

        [분석 대상 데이터]
        {''.join(holdings_prompts)}
        {''.join(watchlist_prompts)}

        [💥 분석 가이드라인 - 엄격 준수]
        1. **데이터 신뢰**: 제공된 RSI 값과 이평선 배열 상태는 정확한 수치이므로 이를 근거로 판단하세요.
        2. **가격 산정**: 
           - **buy_price**: 최근 30일 차트의 '지지선' 가격을 찾아 정수로 제시 (눌림목 타점).
           - **target_price**: 저항선 가격.
           - **stop_loss**: 지지 라인 이탈 가격.
        3. **차트 패턴**: 최근 30일 데이터 표를 보고 '쌍바닥', '박스권 돌파', '하락 추세' 등의 패턴을 읽어내세요.

        [출력 형식 (JSON Only)]
        반드시 아래 JSON 형식으로만 응답하세요.
        {{
          "market_summary": "시장 요약 멘트...",
          "daily_advice": "오늘의 전체적인 대응 전략...",
          "holdings_analysis": [
            {{
              "name": "종목명",
              "outlook": "단기매수/홀딩/매도/관망",
              "analysis": "분석 내용 (RSI 30에서 반등 시도 등)...",
              "buy_price": 0,
              "target_price": 0,
              "stop_loss": 0
            }}
          ],
          "watchlist_analysis": [
            ... 위와 동일 구조 ...
          ]
        }}
        """

        # 3. Gemini에게 요청 전송
        try:
            print("🚀 Gemini에게 리포트 요청 전송 중...")
            response = self.model.generate_content(final_prompt)
            
            # JSON 추출 (Markdown 코드 블록 제거)
            text = response.text.strip()
            # 정규식으로 { ... } 구간만 추출하여 파싱 에러 방지
            json_match = re.search(r'(\{.*\})', text, re.DOTALL)
            
            if json_match:
                clean_json = json_match.group(1)
                return json.loads(clean_json)
            else:
                # 정규식 실패 시 단순 제거 시도
                clean_text = text.replace('```json', '').replace('```', '').strip()
                return json.loads(clean_text)

        except Exception as e:
            print(f"❌ AI 분석 실패: {e}")
            return {"error": str(e)}

# 테스트 실행
if __name__ == "__main__":
    analyst = AIAnalyst()
    # 테스트용 데이터 (실제로는 프론트엔드에서 옴)
    h = [{"name": "SK스퀘어", "code": "402340"}]
    w = [{"name": "나스닥", "code": "^IXIC"}] # 테스트용
    
    result = analyst.generate_daily_report(h, w)
    print(json.dumps(result, ensure_ascii=False, indent=2))