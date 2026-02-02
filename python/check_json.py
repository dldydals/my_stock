import requests
import pandas as pd
from bs4 import BeautifulSoup
from io import StringIO

def check_html_parsing(ticker, name):
    print(f"\n🔍 [{name} ({ticker})] HTML 정밀 파싱 테스트")
    
    # 1. 사람이 보는 그 페이지 (절대 404가 뜰 수 없음)
    url = f"https://finance.naver.com/item/frgn.naver?code={ticker}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Referer': 'https://finance.naver.com/'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        print(f"👉 응답 코드: {response.status_code}")
        
        if response.status_code != 200:
            print("❌ 페이지 접속 실패 (IP 차단 가능성)")
            return

        html = response.content.decode('euc-kr', 'replace')
        soup = BeautifulSoup(html, 'html.parser')
        
        # 2. '외국인 기관 순매매 거래량' 표 찾기 (일별 확정치)
        # 네이버 금융 페이지 하단에 있는 그 표입니다.
        tables = soup.find_all("table", class_="type2")
        
        target_table = None
        for table in tables:
            # 헤더에 '기관'과 '외국인'이 동시에 있는 표를 찾음
            if "기관" in table.text and "외국인" in table.text and "날짜" in table.text:
                target_table = table
                # 잠정치 표(상단)말고 하단 '일별' 표를 찾기 위해 두 번째나 내용이 많은 걸 선택해야 함
                # 보통 일별 표는 행(tr)이 많음
                if len(table.find_all("tr")) > 10: 
                    break
        
        if target_table:
            # pandas로 예쁘게 파싱
            df = pd.read_html(StringIO(str(target_table)))[0]
            df = df.dropna(how='all') # 빈 줄 제거
            
            # 날짜가 있는 행만 남기기 (YYYY.MM.DD 형식)
            df = df[df.iloc[:, 0].str.match(r'\d{4}\.\d{2}\.\d{2}', na=False)]
            
            if not df.empty:
                latest = df.iloc[1] # 0번은 보통 오늘 날짜(장중이면 비어있을 수 있음) or 가장 최신
                
                # 어제(혹은 오늘 확정) 데이터
                date_str = latest.iloc[0]
                # 네이버 표 구조상: [날짜, 종가, 전일비, 등락률, 거래량, 기관, 외국인] 순서일 가능성 높음
                # 하지만 컬럼 위치가 바뀔 수 있으니 컬럼명으로 찾거나 인덱스로 접근
                
                # 보통: 날짜(0), 종가(1), 전일비(2), 등락률(3), 거래량(4), 기관(5), 외국인(6) ...
                # (종목마다 컬럼 개수가 다를 수 있어 값을 찍어봐야 함)
                
                print(f"✅ 파싱 성공! (날짜: {date_str})")
                print(f"   데이터 샘플: {latest.tolist()}")
                
                # 기관/외국인 수치 추출 시도 (보통 뒤쪽에 위치)
                # 데이터프레임 컬럼 이름을 확인해서 매핑
                print(f"   컬럼명: {df.columns.tolist()}")
            else:
                print("⚠️ 표는 찾았으나 데이터 행이 없습니다.")
        else:
            print("❌ '일별 매매동향' 표를 찾지 못했습니다.")

    except Exception as e:
        print(f"❌ 에러 발생: {e}")

if __name__ == "__main__":
    check_html_parsing("005930", "삼성전자")