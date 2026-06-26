# PortAI: Staging step 1
from fastapi import APIRouter
from app.services.news_service import get_aggregated_news

router = APIRouter()

@router.get("/feed")
async def news_feed_endpoint(symbol: str = None, limit: int = 20):
    return await get_aggregated_news(symbol, limit)
