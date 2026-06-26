from fastapi import APIRouter, HTTPException
from app.services.market_data import get_quote, get_fundamentals, get_indices, get_top_movers
from app.services.technical_service import compute_indicators

router = APIRouter()

@router.get("/quote")
async def quote_endpoint(symbol: str, exchange: str = "NSE"):
    res = await get_quote(symbol, exchange)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.get("/indices")
async def indices_endpoint():
    return await get_indices()

@router.get("/movers")
async def movers_endpoint(exchange: str = "NSE"):
    return await get_top_movers(exchange)

@router.get("/fundamentals")
async def fundamentals_endpoint(symbol: str, exchange: str = "NSE"):
    res = await get_fundamentals(symbol, exchange)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.get("/technicals")
async def technicals_endpoint(symbol: str, exchange: str = "NSE"):
    res = await compute_indicators(symbol, exchange)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res
