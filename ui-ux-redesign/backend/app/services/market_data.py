import yfinance as yf
import pandas as pd
from typing import Optional
from datetime import datetime
import asyncio

def normalize_symbol(symbol: str, exchange: str = "NSE") -> str:
    """Convert display symbol to yfinance format."""
    symbol = symbol.upper().strip()
    if exchange == "NSE":
        return symbol if symbol.endswith(".NS") else f"{symbol}.NS"
    elif exchange == "BSE":
        return symbol if symbol.endswith(".BO") else f"{symbol}.BO"
    elif exchange in ("NYSE", "NASDAQ", "US"):
        return symbol
    return symbol

async def get_quote(symbol: str, exchange: str = "NSE") -> dict:
    """Get current price quote. Never returns hardcoded data."""
    yf_symbol = normalize_symbol(symbol, exchange)
    try:
        ticker = yf.Ticker(yf_symbol)
        info = ticker.fast_info
        hist = await asyncio.to_thread(lambda: ticker.history(period="2d", interval="1d"))

        if hist.empty:
            return {"error": f"No data found for {symbol}", "symbol": symbol}

        current = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
        change = current - prev_close
        change_pct = (change / prev_close) * 100 if prev_close else 0

        return {
            "symbol": symbol,
            "exchange": exchange,
            "yf_symbol": yf_symbol,
            "current_price": round(current, 2),
            "previous_close": round(prev_close, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "open": round(float(hist["Open"].iloc[-1]), 2),
            "high": round(float(hist["High"].iloc[-1]), 2),
            "low": round(float(hist["Low"].iloc[-1]), 2),
            "volume": int(hist["Volume"].iloc[-1]),
            "currency": "INR" if exchange in ("NSE", "BSE") else "USD",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

async def get_ohlcv(
    symbol: str,
    exchange: str = "NSE",
    period: str = "3mo",
    interval: str = "1d"
) -> list[dict]:
    """Get OHLCV data for charting. Returns list of candles."""
    yf_symbol = normalize_symbol(symbol, exchange)
    try:
        ticker = yf.Ticker(yf_symbol)
        hist = await asyncio.to_thread(lambda: ticker.history(period=period, interval=interval))
        if hist.empty:
            return []

        hist.index = pd.to_datetime(hist.index)
        candles = []
        for ts, row in hist.iterrows():
            candles.append({
                "time": int(ts.timestamp()),  # Unix timestamp for Lightweight Charts
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row["Volume"]),
            })
        return candles
    except Exception as e:
        print(f"Error fetching OHLCV for {symbol}: {e}")
        return []

async def get_fundamentals(symbol: str, exchange: str = "NSE") -> dict:
    """Get company fundamentals from yfinance."""
    yf_symbol = normalize_symbol(symbol, exchange)
    try:
        ticker = yf.Ticker(yf_symbol)
        info = await asyncio.to_thread(lambda: ticker.info)
        if not info:
            return {"error": "No fundamental info found"}
        return {
            "symbol": symbol,
            "company_name": info.get("longName", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "pb_ratio": info.get("priceToBook"),
            "eps": info.get("trailingEps"),
            "revenue": info.get("totalRevenue"),
            "revenue_growth": info.get("revenueGrowth"),
            "gross_margins": info.get("grossMargins"),
            "operating_margins": info.get("operatingMargins"),
            "profit_margins": info.get("profitMargins"),
            "debt_to_equity": info.get("debtToEquity"),
            "current_ratio": info.get("currentRatio"),
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            "free_cashflow": info.get("freeCashflow"),
            "dividend_yield": info.get("dividendYield"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "avg_volume": info.get("averageVolume"),
            "beta": info.get("beta"),
            "description": info.get("longBusinessSummary", ""),
        }
    except Exception as e:
        return {"error": str(e)}

async def get_multiple_quotes(symbols_exchanges: list[tuple[str, str]]) -> list[dict]:
    """Batch fetch quotes concurrently."""
    tasks = [get_quote(sym, exch) for sym, exch in symbols_exchanges]
    return await asyncio.gather(*tasks)

async def get_indices() -> dict:
    """Live indices data — NSE, BSE, US."""
    indices = {
        "NIFTY 50": ("^NSEI", "NSE"),
        "SENSEX": ("^BSESN", "BSE"),
        "BANKNIFTY": ("^NSEBANK", "NSE"),
        "NIFTYIT": ("^CNXIT", "NSE"),
        "SP500": ("^GSPC", "US"),
        "NASDAQ": ("^IXIC", "US"),
        "DOW": ("^DJI", "US"),
        "VIX_INDIA": ("^INDIAVIX", "NSE"),
        "VIX_US": ("^VIX", "US"),
        "GOLD": ("GC=F", "COMMODITY"),
        "CRUDE": ("CL=F", "COMMODITY"),
        "USDINR": ("USDINR=X", "FOREX"),
    }
    results = {}
    
    async def fetch_idx(name, yf_sym, cat):
        try:
            ticker = yf.Ticker(yf_sym)
            hist = await asyncio.to_thread(lambda: ticker.history(period="2d", interval="1d"))
            if not hist.empty:
                current = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                return name, {
                    "price": round(current, 2),
                    "change": round(current - prev, 2),
                    "change_pct": round(((current - prev) / prev) * 100, 2) if prev else 0,
                    "category": cat
                }
        except:
            pass
        return name, None

    tasks = [fetch_idx(name, yf_sym, cat) for name, (yf_sym, cat) in indices.items()]
    resolved = await asyncio.gather(*tasks)
    for name, data in resolved:
        if data:
            results[name] = data
    return results

async def get_top_movers(exchange: str = "NSE", count: int = 10) -> dict:
    """Top gainers and losers from NSE Nifty 50 universe."""
    NIFTY50_SYMBOLS = [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR",
        "ICICIBANK", "KOTAKBANK", "BHARTIARTL", "ITC", "AXISBANK",
        "SBIN", "LT", "WIPRO", "HCLTECH", "BAJFINANCE",
        "ASIANPAINT", "MARUTI", "NESTLEIND", "TITAN", "ULTRACEMCO",
        "ONGC", "NTPC", "POWERGRID", "COALINDIA", "BPCL",
        "TECHM", "DIVISLAB", "DRREDDY", "CIPLA", "SUNPHARMA",
        "APOLLOHOSP", "BAJAJFINSV", "BRITANNIA", "ADANIENT", "ADANIPORTS",
        "TATACONSUM", "TATAMOTORS", "TATASTEEL", "HINDALCO", "JSWSTEEL",
        "M&M", "HEROMOTOCO", "EICHERMOT", "INDUSINDBK", "HDFCLIFE",
        "SBILIFE", "UPL", "GRASIM", "SHREECEM", "LTIM"
    ]
    symbols_exchanges = [(s, exchange) for s in NIFTY50_SYMBOLS]
    quotes = await get_multiple_quotes(symbols_exchanges)
    valid = [q for q in quotes if "error" not in q and q.get("change_pct") is not None]
    sorted_by_change = sorted(valid, key=lambda x: x["change_pct"], reverse=True)
    return {
        "gainers": sorted_by_change[:count],
        "losers": sorted_by_change[-count:][::-1]
    }
