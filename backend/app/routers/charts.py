# PortAI: Staging step 1
from fastapi import APIRouter
from app.services.market_data import get_ohlcv

router = APIRouter()

@router.get("/ohlcv")
async def ohlcv_endpoint(symbol: str, exchange: str = "NSE", period: str = "3mo", interval: str = "1d"):
    return await get_ohlcv(symbol, exchange, period, interval)
