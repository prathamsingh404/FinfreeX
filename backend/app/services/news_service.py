import feedparser
import httpx
from datetime import datetime
import asyncio
from typing import Optional
from app.config import get_settings

settings = get_settings()

RSS_FEEDS = {
    "Moneycontrol": "https://www.moneycontrol.com/rss/latestnews.xml",
    "Economic Times": "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
    "Livemint": "https://www.livemint.com/rss/markets"
}

async def fetch_rss_feed(source: str, url: str) -> list[dict]:
    """Asynchronously parse an RSS news feed using feedparser."""
    try:
        # Run synchronous feedparser inside a thread pool
        loop = asyncio.get_event_loop()
        feed = await loop.run_in_executor(None, feedparser.parse, url)
        articles = []
        for entry in feed.entries[:8]:
            pub_date = entry.get("published", "")
            # Clean up timestamp format
            articles.append({
                "title": entry.get("title", ""),
                "source": source,
                "url": entry.get("link", ""),
                "published_at": pub_date,
                "description": entry.get("summary", entry.get("description", ""))
            })
        return articles
    except Exception as e:
        print(f"Error parsing feed {source}: {e}")
        return []

async def fetch_news_api(symbol: Optional[str] = None) -> list[dict]:
    """Fetch global financial news using NewsAPI (free tier fallback)."""
    if not settings.news_api_key:
        return []
    
    query = symbol if symbol else "Indian stock market OR Sensex OR Nifty"
    url = f"https://newsapi.org/v2/everything?q={query}&sortBy=publishedAt&apiKey={settings.news_api_key}"
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                articles = []
                for item in data.get("articles", [])[:15]:
                    articles.append({
                        "title": item.get("title"),
                        "source": item.get("source", {}).get("name", "NewsAPI"),
                        "url": item.get("url"),
                        "published_at": item.get("publishedAt"),
                        "description": item.get("description")
                    })
                return articles
    except Exception as e:
        print(f"NewsAPI query failed: {e}")
    return []

async def get_aggregated_news(symbol: Optional[str] = None, limit: int = 20) -> list[dict]:
    """Aggregate feeds from both RSS and NewsAPI, removing duplicates."""
    tasks = [fetch_rss_feed(source, url) for source, url in RSS_FEEDS.items()]
    if settings.news_api_key:
        tasks.append(fetch_news_api(symbol))
        
    results = await asyncio.gather(*tasks)
    all_articles = []
    seen_titles = set()
    
    for articles_list in results:
        for a in articles_list:
            title_lower = a["title"].lower().strip()
            if title_lower not in seen_titles and len(title_lower) > 5:
                seen_titles.add(title_lower)
                all_articles.append(a)
                
    # No invented headlines. Fabricated stories carry real outlet names and
    # plausible detail, so a reader has no way to tell them from reporting.
    # An empty feed is served as empty and the client says the feed is down.
    return all_articles[:limit]
