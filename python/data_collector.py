import yfinance as yf
import FinanceDataReader as fdr
import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
from datetime import datetime, timedelta

# Default Tickers for Market Sentiment
US_TICKERS = {
    'NASDAQ': '^IXIC',
    'DOW': '^DJI',
    'S&P500': '^GSPC',
    '환율(KRW/USD)': 'KRW=X',
    '미국10년물국채(US10Y)': '^TNX',
    '반도체지수(SOXX)': 'SOXX',
    '엔비디아(NVDA)': 'NVDA',
    '마이크론(MU)': 'MU'
}

def get_holdings_price_data(holdings_info):
    """
    Fetches the current price and 1-month performance for each holding.
    This provides an 'anchor' for the AI to avoid hallucinating unrealistic target prices.
    """
    print("📊 Fetching real-time price data for holdings...")
    holdings_stats = {}
    
    # 1 month ago date for trend calculation
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    end_date = datetime.now().strftime('%Y-%m-%d')

    for stock in holdings_info:
        name = stock['name']
        code = stock.get('code')
        if not code: continue

        try:
            # Determine if it's KR or US stock (simple check by code length)
            is_kr = len(code) == 6 and code.isdigit()
            
            if is_kr:
                df = fdr.DataReader(code, start_date, end_date)
            else:
                df = yf.download(code, start=start_date, end=end_date, progress=False, auto_adjust=True)

            if not df.empty:
                current_price = df['Close'].iloc[-1]
                # Fix: explicit float/int conversion
                if hasattr(current_price, 'iloc'):
                    val_current = float(current_price.iloc[0]) if is_kr else float(current_price.iloc[0])
                else:
                    val_current = float(current_price)
                
                start_price = df['Close'].iloc[0]
                if hasattr(start_price, 'iloc'):
                    val_start = float(start_price.iloc[0])
                else:
                    val_start = float(start_price)
                
                change_1m = ((val_current - val_start) / val_start) * 100
                
                holdings_stats[name] = {
                    "current_price": round(val_current, 0) if is_kr else round(val_current, 2),
                    "change_1m_pct": round(change_1m, 2),
                    "currency": "KRW" if is_kr else "USD"
                }
        except Exception as e:
            print(f"Error fetching price for {name}: {e}")

    return holdings_stats

def get_market_data_json(years=3):
    """
    Fetches US/KR market data for the last N years and returns it as a JSON string.
    Optimized for token usage by rounding values.
    """
    print(f"📊 Market data collection starting ({years} years)...")
    
    start_date = (datetime.now() - timedelta(days=365*years)).strftime('%Y-%m-%d')
    end_date = datetime.now().strftime('%Y-%m-%d')
    
    combined_data = {}

    # Fetch US Market Indices
    for name, ticker in US_TICKERS.items():
        try:
            print(f"Fetching {name} ({ticker})...")
            # Using progress=False to keep logs clean
            df = yf.download(ticker, start=start_date, end=end_date, progress=False, auto_adjust=True)
            if not df.empty:
                # Optimized formatting: Date as key, Close as value
                df_subset = df[['Close']].reset_index()
                df_subset['Date'] = df_subset['Date'].dt.strftime('%Y-%m-%d')
                
                # Handling multi-index columns if any (yf sometimes returns them)
                if isinstance(df_subset['Close'], pd.DataFrame):
                    prices = df_subset['Close'].iloc[:, 0]
                else:
                    prices = df_subset['Close']
                
                combined_data[name] = dict(zip(df_subset['Date'], prices.round(2).tolist()))
        except Exception as e:
            print(f"Error fetching {name}: {e}")

    return json.dumps(combined_data, ensure_ascii=False)

def get_naver_news_summary(holdings_info):
    """
    Crawls Naver Finance News/Disclosures for each stock in the portfolio.
    holdings_info: list of dicts with {'name': str, 'code': str}
    """
    print("📰 Portfolio news collection starting...")
    
    news_report = {}
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }

    for stock in holdings_info:
        name = stock['name']
        code = stock.get('code')
        
        # We need a code to crawl Naver Finance specifically
        if not code:
            news_report[name] = ["종목 코드가 없어 뉴스를 수집할 수 없습니다."]
            continue

        # Correct headers with Referer for each stock
        headers['Referer'] = f'https://finance.naver.com/item/main.naver?code={code}'

        try:
            # Standardizing on news_news.naver?sm=title_entity_id.basic for best grouped headlines
            url = f"https://finance.naver.com/item/news_news.naver?code={code}&sm=title_entity_id.basic"
            res = requests.get(url, headers=headers)
            # Naver Finance uses EUC-KR
            soup = BeautifulSoup(res.content.decode('euc-kr', 'replace'), 'html.parser')

            articles = []
            # More precise selector for Naver's news list
            titles = soup.select('td.title a.tit')
            if not titles:
                titles = soup.select('td.title a') # Fallback
            
            for title in titles[:20]: # Increased to 20 to catch buried news
                raw_title = title.get_text().strip()
                clean_title = ' '.join(raw_title.split())
                articles.append(clean_title)
            
            if not articles:
                articles = ["최근 별다른 특이 뉴스 없음"]
                
            news_report[name] = articles
            
        except Exception as e:
            print(f"Error crawling news for {name}: {e}")
            news_report[name] = [f"뉴스 수집 실패: {str(e)}"]

    return json.dumps(news_report, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    # Test execution
    test_holdings = [{"name": "현대모비스", "code": "012330"}, {"name": "삼성전자", "code": "005930"}]
    m_data = get_market_data_json(years=1) # 1 year for quick test
    n_data = get_naver_news_summary(test_holdings)
    print("\n--- [Market Data Sample] ---")
    print(list(json.loads(m_data).keys()))
    print("\n--- [News Data] ---")
    print(n_data)
