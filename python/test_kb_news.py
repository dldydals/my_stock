import requests
from bs4 import BeautifulSoup
import json

def test_stock_news(code, name):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': f'https://finance.naver.com/item/main.naver?code={code}'
    }
    # Using the exact iframe URL seen in the main page
    url = f"https://finance.naver.com/item/news_news.naver?code={code}&sm=title_entity_id.basic"
    
    print(f"\n📡 Requesting news for {name} ({code}): {url}")
    res = requests.get(url, headers=headers)
    print(f"📡 Response length: {len(res.content)}")
    
    soup = BeautifulSoup(res.content.decode('euc-kr', 'replace'), 'html.parser')
    
    # Save full Soup to see structure
    with open("kb_debug.html", "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    
    articles = []
    # Try different selectors
    # Naver Finance News list is usually in td.title a
    titles = soup.select('td.title a.tit')
    if not titles:
        titles = soup.select('td.title a')
    
    if not titles:
        titles = soup.select('.title .tit')
    
    for title in titles[:20]: # Expanded to 20
        raw_title = title.get_text().strip()
        clean_title = ' '.join(raw_title.split())
        articles.append(clean_title)
        if "ELS" in clean_title or "과징금" in clean_title:
            print(f"✅ Found target news: {clean_title}")
    
    print(f"\n--- [{name} News Headlines] ---")
    if not articles:
        print(f"❌ No articles found for {name}.")
    for i, title in enumerate(articles, 1):
        print(f"{i}. {title}")

if __name__ == "__main__":
    test_stock_news("105560", "KB금융")
    test_stock_news("005930", "삼성전자")
