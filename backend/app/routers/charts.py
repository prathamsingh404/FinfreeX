from datetime import datetime, timezone
from fastapi import APIRouter
from app.services.market_data import get_ohlcv

router = APIRouter()

@router.get("/ohlcv")
async def ohlcv_endpoint(symbol: str, exchange: str = "NSE", period: str = "3mo", interval: str = "1d"):
    return await get_ohlcv(symbol, exchange, period, interval)


# ── Compatibility route for TradingViewChart.tsx ──────────────────────
# The main chart component fetches `/api/history/{symbol}?period=1mo`.
# This adapts the existing OHLCV service to the shape it expects:
#   { history: [{ date: "YYYY-MM-DD", open, high, low, close, volume }] }

PERIOD_TO_INTERVAL = {
    "1d":  "5m",
    "5d":  "15m",
    "1mo": "1h",
    "3mo": "1d",
    "6mo": "1d",
    "1y":  "1wk",
    "2y":  "1wk",
    "5y":  "1mo",
    "max": "1mo",
}


@router.get("/history/{symbol}")
async def history_compat(symbol: str, period: str = "3mo", exchange: str = "NSE"):
    """Translate OHLCV candles into the {time, date, ...} format TradingViewChart expects."""
    interval = PERIOD_TO_INTERVAL.get(period, "1d")
    candles = await get_ohlcv(symbol, exchange, period, interval)
    if not candles:
        return {"history": [], "error": None}
    history = []
    for c in candles:
        try:
            dt = datetime.fromtimestamp(c["time"], tz=timezone.utc)
            history.append({
                "time": c["time"],
                "date": dt.strftime("%Y-%m-%d"),
                "open": c["open"],
                "high": c["high"],
                "low": c["low"],
                "close": c["close"],
                "volume": c["volume"],
            })
        except Exception:
            continue
    return {"history": history}
