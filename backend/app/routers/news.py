from fastapi import APIRouter
from app.services.news_service import get_aggregated_news

router = APIRouter()

@router.get("/feed")
async def news_feed_endpoint(symbol: str = None, limit: int = 20):
    return await get_aggregated_news(symbol, limit)


@router.get("")
async def news_compat(symbol: str = None, limit: int = 20):
    """TradingViewChart fetches /api/news?symbol=X — wrap feed in {news: [...]}."""
    items = await get_aggregated_news(symbol, limit)
    # get_aggregated_news returns a list of dicts
    if isinstance(items, list):
        return {"news": items}
    return {"news": []}
