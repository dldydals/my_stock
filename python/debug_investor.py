import requests
import pandas as pd
from bs4 import BeautifulSoup
from io import StringIO
from pykrx import stock
from datetime import datetime, timedelta

# 테스트할 종목 (삼성전자: 데이터가 무조건 있어야 함)
TICKER = "005930" 
NAME = "삼성전자"

print(f"🕵️‍♂️ [진단 시작] {NAME}({TICKER}) 수급 데이터 정밀 진단\n")

# ========================================================
# 1. 네이버 금융 크롤링 테스트
# ========================================================
print("-" * 50)
print("📡 1. 네이버 금융 (실시간/잠정치) 테스트")
print("-" * 50)

url = f"https://finance.naver.com/item/frgn.naver?code={TICKER}"
headers = {'User-Agent': 'Mozilla/5.0'}

try:
    response = requests.get(url, headers=headers, timeout=5)
    print(f"👉 HTTP 상태 코드: {response.status_code}")
    
    html = response.content.decode('euc-kr', 'replace')
    soup = BeautifulSoup(html, 'html.parser')
    
    # 테이블 찾기
    tables = soup.find_all("table", class_="type2")
    target_table = None
    for tbl in tables:
        if "잠정" in tbl.text:
            target_table = tbl
            print("👉 '잠정' 테이블 발견함!")
            break
            
    if target_table:
        df = pd.read_html(StringIO(str(target_table)))[0]
        df = df.dropna(how='all')
        print(f"👉 데이터 프레임 크기: {df.shape}")
        print("▼▼▼ 추출된 데이터 (상위 5줄) ▼▼▼")
        print(df.head())
        
        # 유효 데이터 필터링 테스트
        if len(df.columns) >= 3:
            valid_rows = df[df.iloc[:, 0].str.contains(':', na=False)]
            if not valid_rows.empty:
                print("\n✅ [성공] 시간별 잠정치 데이터가 있습니다.")
                latest = valid_rows.iloc[-1]
                print(f"   -> 시간: {latest.iloc[0]} | 외인: {latest.iloc[1]} | 기관: {latest.iloc[2]}")
            else:
                print("\n⚠️ [경고] 테이블은 있는데, 시간별 데이터(09:00...)가 안 보입니다. (장 시작 전이거나 집계 안 됨)")
    else:
        print("\n❌ [실패] '잠정' 테이블을 찾을 수 없습니다. (HTML 구조 변경 또는 차단)")

except Exception as e:
    print(f"\n❌ [에러] 네이버 크롤링 중 오류: {e}")


# ========================================================
# 2. Pykrx 테스트 (과거 데이터)
# ========================================================
print("\n" + "-" * 50)
print("📚 2. Pykrx (과거 데이터) 테스트")
print("-" * 50)

today = datetime.now()
start_date = (today - timedelta(days=7)).strftime("%Y%m%d")
end_date = today.strftime("%Y%m%d")

print(f"👉 조회 기간: {start_date} ~ {end_date}")

try:
    # 1. 일별 거래실적 (기간 조회)
    print("👉 stock.get_market_trading_value_by_date 호출 시도...")
    df = stock.get_market_trading_value_by_date(start_date, end_date, TICKER)
    
    if df.empty:
        print("⚠️ [경고] 결과가 비어있습니다 (Empty DataFrame).")
        print("   -> 종목코드가 틀렸거나, 해당 기간에 거래가 없거나, KRX 접속 차단.")
    else:
        print("✅ [성공] 데이터를 가져왔습니다.")
        print(f"   -> 컬럼 목록: {list(df.columns)}")
        print("▼▼▼ 최근 3일치 데이터 ▼▼▼")
        print(df.tail(3))
        
        last_row = df.iloc[-1]
        print("\n👉 마지막 날짜 데이터 파싱:")
        
        # 컬럼명 확인
        f_col = '외국인합계' if '외국인합계' in df.columns else '외국인'
        i_col = '기관합계' if '기관합계' in df.columns else '기관'
        
        print(f"   -> 사용 컬럼: {f_col}, {i_col}")
        print(f"   -> 값: 외인({last_row.get(f_col)}), 기관({last_row.get(i_col)})")

except Exception as e:
    print(f"❌ [에러] Pykrx 실행 중 오류: {e}")
    print("   -> 모듈 버전 문제이거나 인터넷 연결 문제일 수 있습니다.")

print("\n" + "=" * 50)
print("진단 종료")