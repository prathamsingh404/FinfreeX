"""HTTP surface for the unified multi-agent engine.

Replaces the old Stratton engine with the new unified agent pipeline.
All API response shapes are preserved for frontend compatibility.
"""
from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents.graph import run_analysis_stream, run_analysis_sync
from app.agents.llm import get_available_providers
from app.agents.personas import PERSONA_REGISTRY, DEFAULT_PERSONAS

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Engine bootstrap (keep stratton path for backtest/paper trading) ─────
_ENGINE_ROOT = Path(__file__).resolve().parent.parent / "stratton"
if str(_ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(_ENGINE_ROOT))

_STATE_DIR = _ENGINE_ROOT / ".state"
_PAPER_STATE_PATH = _STATE_DIR / "paper_trading.json"


def _engine_unavailable(exc: Exception) -> HTTPException:
    logger.exception("Engine component import failed")
    return HTTPException(
        status_code=503,
        detail=f"Engine component unavailable. Detail: {exc}",
    )


# ── JSON safety ─────────────────────────────────────────────────────────
def _jsonable(value: Any, _depth: int = 0) -> Any:
    """Convert output to JSON-serializable form."""
    if _depth > 12:
        return str(value)
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _jsonable(v, _depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(v, _depth + 1) for v in value]
    if isinstance(value, BaseModel):
        return _jsonable(value.model_dump(), _depth + 1)
    for attr in ("model_dump", "dict"):
        fn = getattr(value, attr, None)
        if callable(fn):
            try:
                return _jsonable(fn(), _depth + 1)
            except Exception:
                break
    if hasattr(value, "content"):
        return str(getattr(value, "content"))
    return str(value)


# ── Request models ──────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    tickers: list[str] = Field(default_factory=list)
    ticker: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    cash: float = 100_000
    model_name: str = "auto"
    model_provider: str = "auto"
    use_llm: bool = True  # Default to True now — agents ARE LLM-powered
    personas: Optional[list[str]] = None
    show_reasoning: bool = True
    exchange: str = "NSE"

    def resolved_tickers(self) -> list[str]:
        raw = list(self.tickers)
        if self.ticker:
            raw.append(self.ticker)
        out: list[str] = []
        for t in raw:
            for part in str(t).replace(",", " ").split():
                cleaned = part.strip().upper()
                if cleaned and cleaned not in out:
                    out.append(cleaned)
        return out


class BacktestRequest(BaseModel):
    tickers: list[str] = Field(default_factory=list)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_cash: float = 100_000
    commission_rate: float = 0.001
    slippage_rate: float = 0.00005
    model_name: str = "auto"
    model_provider: str = "auto"
    use_llm: bool = False
    personas: Optional[list[str]] = None


class PaperTradeRequest(BaseModel):
    tickers: list[str] = Field(default_factory=list)
    initial_cash: float = 100_000
    lookback_days: int = 90
    model_name: str = "auto"
    model_provider: str = "auto"
    use_llm: bool = False
    personas: Optional[list[str]] = None


# ── Analyst & Persona Registry ──────────────────────────────────────────
_ANALYST_META = {
    "fundamentals": {"name": "Fundamentals", "focus": "Margins, returns on capital, balance sheet strength"},
    "technical": {"name": "Technical", "focus": "Trend, momentum and price structure"},
    "sentiment": {"name": "Sentiment", "focus": "News tone and market narrative"},
    "valuation": {"name": "Valuation", "focus": "Intrinsic value against the traded price"},
    "macro": {"name": "Macro Regime", "focus": "Sector rotation, rates, and cycle positioning"},
    "risk": {"name": "Risk", "focus": "Tail risks, leverage, and downside scenarios"},
}


@router.get("/analysts")
async def list_analysts() -> dict[str, Any]:
    """Core analysts that always run."""
    return {
        "analysts": [
            {
                "key": key,
                "node": f"{key}_analyst",
                "name": meta["name"],
                "focus": meta["focus"],
                "always_on": True,
            }
            for key, meta in _ANALYST_META.items()
        ]
    }


@router.get("/personas")
async def list_personas() -> dict[str, Any]:
    """Investor personas — opt-in agents."""
    return {
        "personas": [
            {
                "key": key,
                "node": f"{key}_analyst",
                "name": display_name,
                "style": style,
                "always_on": False,
            }
            for key, (display_name, style, _func) in PERSONA_REGISTRY.items()
        ]
    }


@router.get("/providers")
async def list_providers() -> dict[str, Any]:
    """Which LLM providers are configured."""
    providers = get_available_providers()
    configured = [p for p in providers if p["configured"]]

    return {
        "providers": providers,
        "default_provider": configured[0]["key"] if configured else None,
        "default_model": configured[0]["models"][0] if configured else None,
        "llm_available": bool(configured),
    }


# ── Analysis ────────────────────────────────────────────────────────────
@router.post("/analyze")
async def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    """Run the full multi-agent analysis for one or more tickers."""
    tickers = req.resolved_tickers()
    if not tickers:
        raise HTTPException(status_code=422, detail="Provide at least one ticker.")
    if len(tickers) > 10:
        raise HTTPException(status_code=422, detail="Max 10 tickers per request.")

    personas = req.personas or list(DEFAULT_PERSONAS)
    results = {}

    for ticker in tickers:
        try:
            result = await run_analysis_sync(
                ticker=ticker,
                exchange=req.exchange,
                active_personas=personas,
            )
            results[ticker] = result
        except Exception as e:
            logger.exception(f"Analysis failed for {ticker}")
            results[ticker] = {"error": str(e)}

    # Shape response for frontend compatibility
    all_signals = {}
    risk_signals = []
    portfolio_positions = []

    for ticker, result in results.items():
        if "error" in result:
            continue

        analyst_reports = result.get("analyst_reports", {})
        final_verdict = result.get("final_verdict", {})

        # Flatten analyst signals
        for agent_id, report in analyst_reports.items():
            if agent_id not in all_signals:
                all_signals[agent_id] = []
            all_signals[agent_id].append({
                "agent_id": agent_id,
                "ticker": ticker,
                "signal": report.get("signal", "Neutral"),
                "confidence": report.get("confidence", 50),
                "reasoning": report.get("reasoning", ""),
            })

        # Risk signals
        risk_assessment = result.get("risk_assessment", {})
        risk_signals.append({
            "ticker": ticker,
            "signal": risk_assessment.get("consensus_signal", "Neutral"),
            "confidence": risk_assessment.get("consensus_confidence", 50),
            "max_position_size": 25000 if risk_assessment.get("consensus_signal") == "Bullish" else 10000,
        })

        # Portfolio positions
        verdict = final_verdict.get("verdict", "HOLD")
        portfolio_positions.append({
            "ticker": ticker,
            "action": verdict,
            "quantity": 100 if verdict in ("BUY", "STRONG BUY") else 0,
            "confidence": final_verdict.get("conviction_score", 0),
            "reasoning": final_verdict.get("summary", ""),
        })

    return {
        "tickers": tickers,
        "analyst_signals": _jsonable(all_signals),
        "risk_adjusted_signals": _jsonable(risk_signals),
        "portfolio_output": {
            "positions": _jsonable(portfolio_positions),
            "cash_remaining": req.cash,
            "total_value": req.cash,
        },
        "timestamp": datetime.now().isoformat(),
        # Include full results for new frontend features
        "detailed_results": {
            ticker: _jsonable(result)
            for ticker, result in results.items()
        },
    }


@router.post("/analyze/stream")
async def analyze_stream(req: AnalyzeRequest) -> StreamingResponse:
    """Streaming analysis via Server-Sent Events."""
    tickers = req.resolved_tickers()
    if not tickers:
        raise HTTPException(status_code=422, detail="Provide at least one ticker.")

    personas = req.personas or list(DEFAULT_PERSONAS)

    async def event_source():
        yield f"data: {json.dumps({'type': 'start', 'tickers': tickers})}\n\n"

        for ticker in tickers:
            yield f"data: {json.dumps({'type': 'status', 'message': f'Starting analysis for {ticker}...'})}\n\n"
            try:
                async for event in run_analysis_stream(
                    ticker=ticker,
                    exchange=req.exchange,
                    active_personas=personas,
                ):
                    yield f"data: {json.dumps(_jsonable(event))}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Paper trading (delegates to stratton engine if available) ───────────
def _load_paper_state():
    from src.paper_trading.state import load_state
    return load_state(str(_PAPER_STATE_PATH))


def _serialize_paper_state(state) -> dict[str, Any]:
    tracker_value = state.portfolio.cash + sum(
        pos.shares * pos.avg_cost for pos in state.portfolio.positions.values()
    )
    return {
        "exists": True,
        "created_at": state.created_at.isoformat() if state.created_at else None,
        "last_run": state.last_run.isoformat() if state.last_run else None,
        "run_count": state.run_count,
        "config": _jsonable(state.config),
        "cash": state.portfolio.cash,
        "positions": [
            {"ticker": ticker, "shares": pos.shares, "avg_cost": pos.avg_cost, "high_water_mark": pos.high_water_mark}
            for ticker, pos in state.portfolio.positions.items()
        ],
        "book_value": tracker_value,
        "trades": _jsonable(state.trades[-100:]),
        "snapshots": _jsonable(state.snapshots[-250:]),
    }


@router.get("/paper-portfolio")
async def paper_portfolio() -> dict[str, Any]:
    """Current paper book."""
    try:
        state = _load_paper_state()
    except ImportError as exc:
        raise _engine_unavailable(exc)
    except Exception as exc:
        logger.exception("Reading paper state failed")
        raise HTTPException(status_code=500, detail=f"Could not read paper book: {exc}")

    if state is None:
        return {"exists": False, "cash": 0, "positions": [], "trades": [], "snapshots": [], "run_count": 0}
    return _serialize_paper_state(state)


def _run_paper_cycle(req: PaperTradeRequest) -> dict[str, Any]:
    from src.paper_trading.runner import PaperTradingRunner
    from src.paper_trading.state import PaperTradingConfig, create_initial_state, load_state, save_state

    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state(str(_PAPER_STATE_PATH))

    if state is None:
        if not req.tickers:
            raise HTTPException(status_code=422, detail="No paper book exists yet. Send tickers.")
        state = create_initial_state(
            PaperTradingConfig(
                tickers=[t.upper() for t in req.tickers],
                initial_cash=req.initial_cash,
                lookback_days=req.lookback_days,
            )
        )
    elif req.tickers:
        state.config.tickers = [t.upper() for t in req.tickers]

    runner = PaperTradingRunner(
        state=state,
        model_name=req.model_name,
        model_provider=req.model_provider,
        use_llm=req.use_llm,
        personas=req.personas,
        show_reasoning=False,
    )
    updated = runner.run_cycle()
    save_state(updated, str(_PAPER_STATE_PATH))
    return _serialize_paper_state(updated)


@router.post("/paper-trade")
async def paper_trade(req: PaperTradeRequest) -> dict[str, Any]:
    """Run one paper trading cycle."""
    try:
        return await asyncio.to_thread(_run_paper_cycle, req)
    except HTTPException:
        raise
    except ImportError as exc:
        raise _engine_unavailable(exc)
    except Exception as exc:
        logger.exception("Paper trading cycle failed")
        raise HTTPException(status_code=500, detail=f"Paper trading failed: {exc}")


@router.post("/paper-reset")
async def paper_reset() -> dict[str, Any]:
    """Delete the paper book."""
    try:
        if _PAPER_STATE_PATH.exists():
            _PAPER_STATE_PATH.unlink()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not clear paper book: {exc}")
    return {"success": True, "exists": False}


# ── Backtest (delegates to stratton engine) ─────────────────────────────
def _run_backtest(req: BacktestRequest) -> dict[str, Any]:
    from src.backtest.metrics import compute_metrics
    from src.backtest.portfolio_tracker import PortfolioTracker
    from src.graph.workflow import run_hedge_fund

    tickers = [t.upper() for t in req.tickers if t.strip()]
    if not tickers:
        raise HTTPException(status_code=422, detail="Provide at least one ticker.")

    end_date = req.end_date or datetime.now().strftime("%Y-%m-%d")
    start_date = req.start_date or (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

    tracker = PortfolioTracker(
        initial_cash=req.initial_cash,
        commission_rate=req.commission_rate,
        slippage_rate=req.slippage_rate,
    )

    final_state = run_hedge_fund(
        tickers=tickers,
        start_date=start_date,
        end_date=end_date,
        portfolio=tracker.get_portfolio_dict(),
        model_name=req.model_name,
        model_provider=req.model_provider,
        show_reasoning=False,
        use_llm=req.use_llm,
        personas=req.personas,
    )

    data = final_state.get("data", {})
    decisions = (data.get("portfolio_output") or {}).get("decisions", {}) or {}
    prices = data.get("current_prices", {}) or {}

    executed = []
    for ticker, decision in decisions.items():
        action = str(decision.get("action", "hold")).lower()
        quantity = int(decision.get("quantity", 0) or 0)
        price = float(prices.get(ticker, 0) or 0)
        if action in ("buy", "sell") and quantity > 0 and price > 0:
            try:
                trade = tracker.execute_trade(ticker, action, quantity, price, end_date)
                if trade is not None:
                    executed.append(_jsonable(trade))
            except Exception as exc:
                logger.warning("Backtest trade rejected for %s: %s", ticker, exc)

    tracker.record_snapshot(end_date, prices)
    snapshots = tracker.snapshots

    try:
        metrics = _jsonable(compute_metrics(snapshots, tracker.trades))
    except Exception:
        metrics = {}

    equity = [getattr(s, "total_value", 0) for s in snapshots] or [req.initial_cash]

    return {
        "tickers": tickers,
        "start_date": start_date,
        "end_date": end_date,
        "initial_cash": req.initial_cash,
        "final_value": equity[-1],
        "equity": equity,
        "metrics": metrics,
        "trades": executed,
        "decisions": _jsonable(decisions),
        "analyst_signals": _jsonable(data.get("analyst_signals", {})),
    }


@router.post("/backtest")
async def backtest(req: BacktestRequest) -> dict[str, Any]:
    """Run backtest using the Stratton engine."""
    try:
        return await asyncio.to_thread(_run_backtest, req)
    except HTTPException:
        raise
    except ImportError as exc:
        raise _engine_unavailable(exc)
    except Exception as exc:
        logger.exception("Backtest failed")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {exc}")


@router.get("/health")
async def engine_health() -> dict[str, Any]:
    """Engine health check."""
    providers = get_available_providers()
    configured = [p for p in providers if p["configured"]]
    return {
        "ok": bool(configured),
        "analysts": len(_ANALYST_META),
        "personas": len(PERSONA_REGISTRY),
        "providers_configured": len(configured),
        "providers": [p["key"] for p in configured],
    }
