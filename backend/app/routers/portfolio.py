# PortAI: Staging step 1
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.services.portfolio_service import get_portfolio_summary, execute_trade, get_trade_history
from app.dependencies import get_current_user

router = APIRouter()

class TradeRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    trade_type: Literal["BUY", "SELL"]
    quantity: int

@router.get("")
async def get_portfolio(user = Depends(get_current_user)):
    try:
        res = await get_portfolio_summary(user.id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio: {str(e)}")

@router.post("/trade")
async def trade_endpoint(req: TradeRequest, user = Depends(get_current_user)):
    res = await execute_trade(
        user_id=user.id,
        symbol=req.symbol,
        exchange=req.exchange,
        trade_type=req.trade_type,
        quantity=req.quantity
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.get("/trades")
async def get_trades(user = Depends(get_current_user)):
    return get_trade_history(user.id)
