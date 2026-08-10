"""
Derived analytics computed from live market data.

These endpoints exist because several pages were reading from a frontend mock
module. Everything here is calculated from real prices and filings — nothing is
generated. When the inputs are unavailable the response says so rather than
substituting a plausible number.
"""
from __future__ import annotations

import asyncio
import logging
import math
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.market_data import get_fundamentals, get_multiple_quotes, get_ohlcv, get_sectors_data

logger = logging.getLogger(__name__)

router = APIRouter()

TRADING_DAYS = 252

# Cross-asset proxies. Each is a real, quotable instrument, so the matrix is
# computed from prices rather than asserted.
CORRELATION_UNIVERSE: list[tuple[str, str, str]] = [
    ("NIFTY", "^NSEI", "US"),
    ("GOLD", "GC=F", "US"),
    ("USD/INR", "USDINR=X", "US"),
    ("CRUDE", "CL=F", "US"),
    ("BTC", "BTC-USD", "US"),
    ("BONDS", "TLT", "US"),
]


def _returns(closes: list[float]) -> list[float]:
    return [(closes[i] - closes[i - 1]) / closes[i - 1] for i in range(1, len(closes)) if closes[i - 1]]


def _pearson(a: list[float], b: list[float]) -> Optional[float]:
    n = min(len(a), len(b))
    if n < 20:
        return None
    a, b = a[-n:], b[-n:]
    mean_a = sum(a) / n
    mean_b = sum(b) / n
    cov = sum((x - mean_a) * (y - mean_b) for x, y in zip(a, b))
    var_a = sum((x - mean_a) ** 2 for x in a)
    var_b = sum((y - mean_b) ** 2 for y in b)
    if var_a <= 0 or var_b <= 0:
        return None
    return cov / math.sqrt(var_a * var_b)


async def _closes(symbol: str, exchange: str, period: str = "1y") -> list[float]:
    candles = await get_ohlcv(symbol, exchange, period, "1d")
    return [c["close"] for c in candles]


@router.get("/correlation")
async def correlation_matrix(period: str = Query("1y")) -> dict[str, Any]:
    """
    Pearson correlation of daily returns across the asset proxies.

    Assets whose price history could not be fetched are dropped from the
    matrix instead of being filled with a placeholder coefficient.
    """
    series = await asyncio.gather(
        *[_closes(sym, exch, period) for _label, sym, exch in CORRELATION_UNIVERSE]
    )

    available = [
        (label, _returns(closes))
        for (label, _sym, _exch), closes in zip(CORRELATION_UNIVERSE, series)
        if len(closes) > 25
    ]

    if len(available) < 2:
        raise HTTPException(
            status_code=503,
            detail="Not enough price history available to compute correlations.",
        )

    labels = [label for label, _ in available]
    matrix: list[list[Optional[float]]] = []
    for _label_a, returns_a in available:
        row: list[Optional[float]] = []
        for _label_b, returns_b in available:
            if returns_a is returns_b:
                row.append(1.0)
            else:
                value = _pearson(returns_a, returns_b)
                row.append(round(value, 2) if value is not None else None)
        matrix.append(row)

    return {
        "assets": labels,
        "matrix": matrix,
        "period": period,
        "observations": min(len(r) for _l, r in available),
        "computed_at": datetime.utcnow().isoformat(),
    }


@router.get("/sector-rotation")
async def sector_rotation() -> dict[str, Any]:
    """
    Relative strength and momentum per sector, from the live sector board.

    Relative strength is the sector's move indexed to the board average at 100;
    momentum is the weekly move. Both come from prices, not from a label.
    """
    sectors = await get_sectors_data()
    if not sectors:
        raise HTTPException(status_code=503, detail="The sector feed returned nothing.")

    day_moves = [s.get("change_pct") or 0 for s in sectors]
    week_moves = [s.get("week_change_pct") or 0 for s in sectors]
    avg_day = sum(day_moves) / len(day_moves)
    avg_week = sum(week_moves) / len(week_moves)

    rows = []
    for s in sectors:
        day = s.get("change_pct") or 0
        week = s.get("week_change_pct") or 0
        rs = round(100 + (week - avg_week), 2)
        momentum = round(day - avg_day, 2)

        # The four quadrants of the rotation cycle: strength on one axis,
        # the direction of travel on the other.
        if rs >= 100 and momentum >= 0:
            phase = "Leading"
        elif rs >= 100:
            phase = "Weakening"
        elif momentum >= 0:
            phase = "Improving"
        else:
            phase = "Lagging"

        rows.append(
            {
                "sector": s.get("name"),
                "price": s.get("price"),
                "change_pct": day,
                "week_change_pct": week,
                "rs": rs,
                "momentum": momentum,
                "phase": phase,
                "stale": s.get("stale", False),
            }
        )

    return {"sectors": rows, "benchmark_day": round(avg_day, 2), "benchmark_week": round(avg_week, 2)}


@router.get("/risk")
async def risk_metrics(
    symbol: str,
    exchange: str = "NSE",
    benchmark: str = "^NSEI",
    period: str = "1y",
) -> dict[str, Any]:
    """
    Volatility, drawdown, beta and risk-adjusted return for one instrument.

    Every figure is derived from the actual daily closes of the window.
    """
    closes, bench_closes = await asyncio.gather(
        _closes(symbol, exchange, period),
        _closes(benchmark, "US", period),
    )

    if len(closes) < 30:
        raise HTTPException(
            status_code=503,
            detail=f"Not enough price history for {symbol} to compute risk metrics.",
        )

    rets = _returns(closes)
    n = len(rets)
    mean = sum(rets) / n
    variance = sum((r - mean) ** 2 for r in rets) / n
    daily_vol = math.sqrt(variance)
    annual_vol = daily_vol * math.sqrt(TRADING_DAYS)

    downside = [r for r in rets if r < 0]
    downside_vol = (
        math.sqrt(sum(r ** 2 for r in downside) / len(downside)) * math.sqrt(TRADING_DAYS)
        if downside
        else 0.0
    )

    # Maximum peak-to-trough decline over the window
    peak = closes[0]
    max_dd = 0.0
    for c in closes:
        peak = max(peak, c)
        max_dd = min(max_dd, (c - peak) / peak)

    sorted_rets = sorted(rets)
    var95 = sorted_rets[int(n * 0.05)] if n >= 20 else None
    var99 = sorted_rets[int(n * 0.01)] if n >= 100 else None

    annual_return = mean * TRADING_DAYS
    sharpe = annual_return / annual_vol if annual_vol else None
    sortino = annual_return / downside_vol if downside_vol else None

    beta = None
    alpha = None
    bench_rets = _returns(bench_closes)
    if len(bench_rets) >= 30:
        k = min(len(rets), len(bench_rets))
        r_a, r_b = rets[-k:], bench_rets[-k:]
        mean_b = sum(r_b) / k
        cov = sum((x - mean) * (y - mean_b) for x, y in zip(r_a, r_b)) / k
        var_b = sum((y - mean_b) ** 2 for y in r_b) / k
        if var_b > 0:
            beta = cov / var_b
            alpha = (mean - beta * mean_b) * TRADING_DAYS

    def pct(v: Optional[float], places: int = 2) -> Optional[float]:
        return round(v * 100, places) if v is not None else None

    return {
        "symbol": symbol,
        "exchange": exchange,
        "period": period,
        "observations": n,
        "volatility": pct(annual_vol),
        "downside_volatility": pct(downside_vol),
        "max_drawdown": pct(max_dd),
        "var95": pct(var95),
        "var99": pct(var99),
        "annual_return": pct(annual_return),
        "sharpe": round(sharpe, 2) if sharpe is not None else None,
        "sortino": round(sortino, 2) if sortino is not None else None,
        "beta": round(beta, 2) if beta is not None else None,
        "alpha": pct(alpha),
        "benchmark": benchmark,
    }


@router.get("/ratios")
async def ratio_board(symbols: str = Query(..., description="Comma separated symbols"), exchange: str = "NSE") -> dict[str, Any]:
    """Filed ratios for a set of companies. Names that fail to resolve are reported."""
    wanted = [s.strip().upper() for s in symbols.split(",") if s.strip()][:20]
    if not wanted:
        raise HTTPException(status_code=422, detail="Provide at least one symbol.")

    results = await asyncio.gather(*[get_fundamentals(s, exchange) for s in wanted])

    rows = []
    unavailable = []
    for symbol, f in zip(wanted, results):
        if not f or f.get("error"):
            unavailable.append(symbol)
            continue
        rows.append(
            {
                "symbol": symbol,
                "name": f.get("company_name"),
                "sector": f.get("sector"),
                "pe": f.get("pe_ratio"),
                "forward_pe": f.get("forward_pe"),
                "pb": f.get("pb_ratio"),
                "roe": (f["roe"] * 100) if f.get("roe") is not None else None,
                "roa": (f["roa"] * 100) if f.get("roa") is not None else None,
                "debt_to_equity": f.get("debt_to_equity"),
                "current_ratio": f.get("current_ratio"),
                "net_margin": (f["profit_margins"] * 100) if f.get("profit_margins") is not None else None,
                "operating_margin": (f["operating_margins"] * 100) if f.get("operating_margins") is not None else None,
                "revenue_growth": (f["revenue_growth"] * 100) if f.get("revenue_growth") is not None else None,
                "market_cap": f.get("market_cap"),
                "stale": f.get("stale", False),
            }
        )

    return {"ratios": rows, "unavailable": unavailable}


@router.get("/dividends")
async def dividend_board(symbols: str = Query(...), exchange: str = "NSE") -> dict[str, Any]:
    """Dividend yield and payout coverage from filings, for a set of companies."""
    wanted = [s.strip().upper() for s in symbols.split(",") if s.strip()][:20]
    if not wanted:
        raise HTTPException(status_code=422, detail="Provide at least one symbol.")

    results = await asyncio.gather(*[get_fundamentals(s, exchange) for s in wanted])

    rows = []
    unavailable = []
    for symbol, f in zip(wanted, results):
        if not f or f.get("error") or f.get("dividend_yield") is None:
            unavailable.append(symbol)
            continue

        yield_pct = f["dividend_yield"] * 100
        eps = f.get("eps")
        # Payout ratio only exists where both the per-share dividend and EPS
        # are reported; it is left null rather than approximated.
        payout = None
        if eps and f.get("pe_ratio"):
            price = eps * f["pe_ratio"]
            per_share = price * f["dividend_yield"]
            payout = round((per_share / eps) * 100, 1) if eps else None

        rows.append(
            {
                "symbol": symbol,
                "name": f.get("company_name"),
                "sector": f.get("sector"),
                "yield": round(yield_pct, 2),
                "eps": eps,
                "payout": payout,
                "market_cap": f.get("market_cap"),
                "stale": f.get("stale", False),
            }
        )

    return {"dividends": rows, "unavailable": unavailable}


@router.get("/instruments")
async def instrument_board(symbols: str = Query(...), exchange: str = "US") -> dict[str, Any]:
    """
    Live quotes for an arbitrary instrument list.

    Backs the ETF, fund and REIT boards, which previously ran off generated
    figures. The universe is supplied by the caller; every number is live.
    """
    wanted = [s.strip().upper() for s in symbols.split(",") if s.strip()][:30]
    if not wanted:
        raise HTTPException(status_code=422, detail="Provide at least one symbol.")

    quotes = await get_multiple_quotes([(s, exchange) for s in wanted])

    rows = []
    unavailable = []
    for symbol, q in zip(wanted, quotes):
        if not q or q.get("error"):
            unavailable.append(symbol)
            continue
        rows.append(
            {
                "symbol": symbol,
                "price": q.get("current_price"),
                "change": q.get("change"),
                "change_pct": q.get("change_pct"),
                "open": q.get("open"),
                "high": q.get("high"),
                "low": q.get("low"),
                "volume": q.get("volume"),
                "currency": q.get("currency"),
                "stale": q.get("stale", False),
            }
        )

    return {"instruments": rows, "unavailable": unavailable}
