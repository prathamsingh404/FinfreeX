import yfinance as yf
import asyncio
import math
from typing import Optional

def safe_float(val):
    if val is None: return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f): return None
        return f
    except (ValueError, TypeError):
        return None

# Universal Indian stocks (Large, Mid, Small Cap)
NSE_STOCKS = {
    "LARGE_CAP": ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "KOTAKBANK",
                  "BHARTIARTL", "ITC", "AXISBANK", "SBIN", "LT", "WIPRO", "HCLTECH",
                  "BAJFINANCE", "ASIANPAINT", "MARUTI", "NESTLEIND", "TITAN", "ULTRACEMCO"],
    "MID_CAP": ["PIDILITIND", "MUTHOOTFIN", "COFORGE", "PERSISTENT", "LTTS", "ZOMATO",
                "NYKAA", "PAYTM", "POLICYBZR", "DELHIVERY", "IRCTC", "CHOLAFIN",
                "ABCAPITAL", "MANAPPURAM", "TRENT", "WHIRLPOOL", "BLUEDART"],
    "SMALL_CAP": ["ROUTE", "HAPPSTMNDS", "RATEGAIN", "LATENTVIEW", "IDEAFORGE",
                  "EASEMYTRIP", "NAZARA", "NETSCRIBES"],
}

ALL_NSE_SYMBOLS = [s for cat in NSE_STOCKS.values() for s in cat]

async def _fetch_stock_screener_data(symbol: str) -> Optional[dict]:
    """Fetch screener data for a single stock."""
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        # Use fast info and cached info properties
        info = await asyncio.to_thread(lambda: ticker.info)
        hist = await asyncio.to_thread(lambda: ticker.history(period="1y", interval="1d"))
        hist = hist.dropna()
        if hist.empty or not info:
            return None

        # 52-week return
        if len(hist) >= 252:
            ret_1y = ((float(hist["Close"].iloc[-1]) - float(hist["Close"].iloc[-252])) /
                      float(hist["Close"].iloc[-252])) * 100
        elif len(hist) > 0:
            ret_1y = ((float(hist["Close"].iloc[-1]) - float(hist["Close"].iloc[0])) /
                      float(hist["Close"].iloc[0])) * 100
        else:
            ret_1y = 0.0

        # 1-month return
        if len(hist) >= 21:
            ret_1m = ((float(hist["Close"].iloc[-1]) - float(hist["Close"].iloc[-21])) /
                      float(hist["Close"].iloc[-21])) * 100
        elif len(hist) > 0:
            ret_1m = ((float(hist["Close"].iloc[-1]) - float(hist["Close"].iloc[0])) /
                      float(hist["Close"].iloc[0])) * 100
        else:
            ret_1m = 0.0

        # Avg volume comparison
        avg_vol = hist["Volume"].tail(20).mean()
        today_vol = float(hist["Volume"].iloc[-1]) if len(hist) > 0 else 0
        vol_ratio = today_vol / avg_vol if avg_vol > 0 else 1

        return {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "sector": info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "market_cap": safe_float(info.get("marketCap")) or 0,
            "current_price": round(float(hist["Close"].iloc[-1]), 2) if len(hist) > 0 else 0.0,
            "pe_ratio": safe_float(info.get("trailingPE")),
            "pb_ratio": safe_float(info.get("priceToBook")),
            "roe": safe_float(info.get("returnOnEquity") * 100 if info.get("returnOnEquity") else None),
            "revenue_growth": safe_float(info.get("revenueGrowth") * 100 if info.get("revenueGrowth") else None),
            "profit_margins": safe_float(info.get("profitMargins") * 100 if info.get("profitMargins") else None),
            "debt_to_equity": safe_float(info.get("debtToEquity")),
            "dividend_yield": safe_float(info.get("dividendYield") * 100 if info.get("dividendYield") else None),
            "beta": safe_float(info.get("beta")),
            "52w_high": safe_float(info.get("fiftyTwoWeekHigh")),
            "52w_low": safe_float(info.get("fiftyTwoWeekLow")),
            "return_1y": safe_float(round(ret_1y, 2) if ret_1y else None),
            "return_1m": safe_float(round(ret_1m, 2) if ret_1m else None),
            "volume_ratio": safe_float(round(vol_ratio, 2)),
            "avg_volume": int(avg_vol) if avg_vol and not math.isnan(avg_vol) else 0,
        }
    except Exception as e:
        print(f"Screener data fetch error for {symbol}: {e}")
        return None

async def run_screener(filters: dict, universe: str = "ALL") -> list[dict]:
    """
    Run screener with filters. All fields are dynamic.
    """
    symbols = ALL_NSE_SYMBOLS
    # Limit symbols in dev if requested
    if universe in NSE_STOCKS:
        symbols = NSE_STOCKS[universe]

    # Concurrency limit to avoid Yahoo Finance rate limits
    semaphore = asyncio.Semaphore(5)
    async def limited_fetch(sym):
        async with semaphore:
            return await _fetch_stock_screener_data(sym)

    results = await asyncio.gather(*[limited_fetch(s) for s in symbols])
    stocks = [r for r in results if r is not None]

    # Apply filters
    def passes(stock: dict) -> bool:
        def check(val, key, op="min"):
            if val is None:
                return True  # no filter constraint
            stock_val = stock.get(key)
            if stock_val is None:
                return False
            return stock_val >= val if op == "min" else stock_val <= val

        f = filters
        return (
            check(f.get("pe_min"), "pe_ratio", "min") and
            check(f.get("pe_max"), "pe_ratio", "max") and
            check(f.get("pb_max"), "pb_ratio", "max") and
            check(f.get("market_cap_min"), "market_cap", "min") and
            check(f.get("roe_min"), "roe", "min") and
            check(f.get("revenue_growth_min"), "revenue_growth", "min") and
            check(f.get("return_1y_min"), "return_1y", "min") and
            check(f.get("return_1m_min"), "return_1m", "min") and
            check(f.get("volume_ratio_min"), "volume_ratio", "min") and
            check(f.get("debt_to_equity_max"), "debt_to_equity", "max") and
            (not f.get("sector") or stock.get("sector") == f["sector"])
        )

    filtered = [s for s in stocks if passes(s)]

    # Sort
    sort_by = filters.get("sort_by", "market_cap")
    sort_desc = filters.get("sort_order", "desc") == "desc"
    filtered.sort(
        key=lambda x: (x.get(sort_by) if x.get(sort_by) is not None else -999999),
        reverse=sort_desc
    )
    return filtered[:filters.get("limit", 50)]
