from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.services.portfolio_service import get_portfolio_summary, execute_trade, get_trade_history
from app.dependencies import get_current_user
from app.services.market_data import get_fundamentals

router = APIRouter()

class TradeRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    trade_type: Literal["BUY", "SELL"]
    quantity: int

@router.get("")
async def get_portfolio(user = Depends(get_current_user)):
    try:
        summary = await get_portfolio_summary(user.id)
        return {
            "totalValue": summary["total_value"],
            "totalPnl": summary["total_pnl"],
            "totalPnlPct": summary["total_pnl_pct"],
            "dayChange": 0.0, # Or calculate it if we track history
            "investedValue": summary["total_position_value"],
            "totalCost": summary["total_value"] - summary["total_pnl"],
            "cash": summary["cash_balance"],
            "currency": summary["currency"],
            "name": summary["name"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio summary: {str(e)}")

@router.get("/holdings")
async def get_portfolio_holdings(user = Depends(get_current_user)):
    try:
        summary = await get_portfolio_summary(user.id)
        positions = summary.get("positions", [])
        total_value = summary.get("total_value", 0.0)
        
        holdings = []
        for pos in positions:
            symbol = pos["symbol"]
            exchange = pos["exchange"]
            
            # Fetch company name and sector from yfinance or fallback
            try:
                fund = await get_fundamentals(symbol, exchange)
                company_name = fund.get("company_name", f"{symbol} Ltd")
                sector = fund.get("sector", "Other")
            except Exception:
                company_name = f"{symbol} Ltd"
                sector = "Other"
                
            weight = (pos["current_value"] / total_value * 100) if total_value > 0 else 0.0
            
            holdings.append({
                "symbol": symbol,
                "name": company_name,
                "qty": pos["quantity"],
                "avgPrice": pos["avg_buy_price"],
                "price": pos["current_price"],
                "value": pos["current_value"],
                "pnl": pos["pnl"],
                "pnlPct": pos["pnl_pct"],
                "weight": weight,
                "sector": sector
            })
        return holdings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch holdings: {str(e)}")

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
