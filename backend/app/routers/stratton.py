"""
HTTP surface for the Stratton multi-agent engine.

The engine in ``app/stratton`` is a self-contained package that imports its own
modules as top-level ``src.*``. Nothing exposed it over HTTP, so the frontend's
Model Committee and Research pages had no endpoint to call. This router is that
missing layer: it bootstraps the package onto ``sys.path``, runs the LangGraph
workflow off the event loop, and streams each agent's verdict as it lands.

Every import of the engine is deferred into the request path so a missing
optional dependency degrades one endpoint instead of stopping the whole API
from booting.
"""
from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Engine bootstrap ────────────────────────────────────────────────────────
# The engine's modules resolve each other as `src.*`, so its package root has
# to be importable directly rather than as `app.stratton.src`.
_ENGINE_ROOT = Path(__file__).resolve().parent.parent / "stratton"
if str(_ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(_ENGINE_ROOT))

_STATE_DIR = _ENGINE_ROOT / ".state"
_PAPER_STATE_PATH = _STATE_DIR / "paper_trading.json"


def _engine_unavailable(exc: Exception) -> HTTPException:
    logger.exception("Stratton engine import failed")
    return HTTPException(
        status_code=503,
        detail=(
            "The analysis engine could not be loaded. Its dependencies "
            f"(langgraph, langchain) may not be installed. Detail: {exc}"
        ),
    )


# ── JSON safety ─────────────────────────────────────────────────────────────
def _jsonable(value: Any, _depth: int = 0) -> Any:
    """
    Convert engine output to something ``json.dumps`` accepts.

    The agent state carries pydantic models, dates and LangChain messages. The
    depth guard stops a cyclic or pathologically nested structure from turning
    a response into an infinite recursion.
    """
    if _depth > 12:
        return str(value)
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _jsonable(v, _depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(v, _depth + 1) for v in value]
    if isinstance(value, BaseModel):
        return _jsonable(value.model_dump(), _depth + 1)
    # LangChain messages and anything else with a dict-ish shape
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


# ── Request models ──────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    tickers: list[str] = Field(default_factory=list)
    # The frontend sends a single ticker on some screens and a list on others
    ticker: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    cash: float = 100_000
    model_name: str = "gpt-4o-mini"
    model_provider: str = "openai"
    use_llm: bool = False
    personas: Optional[list[str]] = None
    show_reasoning: bool = True

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
    model_name: str = "gpt-4o-mini"
    model_provider: str = "openai"
    use_llm: bool = False
    personas: Optional[list[str]] = None


class PaperTradeRequest(BaseModel):
    tickers: list[str] = Field(default_factory=list)
    initial_cash: float = 100_000
    lookback_days: int = 90
    model_name: str = "gpt-4o-mini"
    model_provider: str = "openai"
    use_llm: bool = False
    personas: Optional[list[str]] = None


# ── Registry ────────────────────────────────────────────────────────────────
# Descriptions live here rather than in the engine so the UI has something to
# show without importing agent modules just to render a picker.
_ANALYST_META: dict[str, dict[str, str]] = {
    "fundamentals": {"name": "Fundamentals", "focus": "Margins, returns on capital, balance sheet strength"},
    "technical": {"name": "Technical", "focus": "Trend, momentum and price structure"},
    "sentiment": {"name": "Sentiment", "focus": "News tone and market narrative"},
    "valuation": {"name": "Valuation", "focus": "Intrinsic value against the traded price"},
    "growth": {"name": "Growth", "focus": "Revenue and earnings trajectory"},
    "macro_regime": {"name": "Macro regime", "focus": "Where the cycle sits and which sectors lead"},
}

_PERSONA_META: dict[str, dict[str, str]] = {
    "buffett": {"name": "Warren Buffett", "style": "Quality businesses at a fair price, held long"},
    "graham": {"name": "Benjamin Graham", "style": "Deep value with a margin of safety"},
    "damodaran": {"name": "Aswath Damodaran", "style": "Discounted cash flow and story-to-number discipline"},
    "ackman": {"name": "Bill Ackman", "style": "Concentrated activist positions"},
    "wood": {"name": "Cathie Wood", "style": "Disruptive innovation over long horizons"},
    "munger": {"name": "Charlie Munger", "style": "Mental models, few decisions, high conviction"},
    "burry": {"name": "Michael Burry", "style": "Contrarian, deeply researched, comfortable being early"},
    "pabrai": {"name": "Mohnish Pabrai", "style": "Cloned bets with asymmetric downside"},
    "lynch": {"name": "Peter Lynch", "style": "Growth at a reasonable price, invest in what you know"},
    "fisher": {"name": "Philip Fisher", "style": "Scuttlebutt research on management quality"},
    "jhunjhunwala": {"name": "Rakesh Jhunjhunwala", "style": "India-focused, cycle-aware conviction bets"},
    "druckenmiller": {"name": "Stanley Druckenmiller", "style": "Macro-led, aggressive sizing, quick to reverse"},
}


def _load_registry() -> tuple[dict, dict]:
    from src.config.agents import ANALYST_CONFIG, PERSONA_CONFIG  # noqa: PLC0415

    return ANALYST_CONFIG, PERSONA_CONFIG


@router.get("/analysts")
async def list_analysts() -> dict[str, Any]:
    """Core analysts. These always run — they are the engine's baseline."""
    try:
        analyst_config, _ = _load_registry()
    except Exception as exc:
        raise _engine_unavailable(exc)

    return {
        "analysts": [
            {
                "key": key,
                "node": node_name,
                "name": _ANALYST_META.get(key, {}).get("name", key.replace("_", " ").title()),
                "focus": _ANALYST_META.get(key, {}).get("focus", ""),
                "always_on": True,
            }
            for key, (node_name, _fn) in analyst_config.items()
        ]
    }


@router.get("/personas")
async def list_personas() -> dict[str, Any]:
    """Investor personas. Opt-in — each one adds an LLM call per ticker."""
    try:
        _, persona_config = _load_registry()
    except Exception as exc:
        raise _engine_unavailable(exc)

    return {
        "personas": [
            {
                "key": key,
                "node": node_name,
                "name": _PERSONA_META.get(key, {}).get("name", key.title()),
                "style": _PERSONA_META.get(key, {}).get("style", ""),
                "always_on": False,
            }
            for key, (node_name, _fn) in persona_config.items()
        ]
    }


@router.get("/providers")
async def list_providers() -> dict[str, Any]:
    """
    Which LLM providers this deployment can actually use.

    Reported from the keys present in the environment, so the UI can disable
    what will not work instead of failing at request time.
    """
    try:
        from src.config import settings as engine_settings  # noqa: PLC0415
    except Exception as exc:
        raise _engine_unavailable(exc)

    catalog = [
        ("openai", "OpenAI", engine_settings.OPENAI_API_KEY, ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"]),
        ("anthropic", "Anthropic", engine_settings.ANTHROPIC_API_KEY, ["claude-sonnet-5", "claude-haiku-4-5-20251001"]),
        ("groq", "Groq", engine_settings.GROQ_API_KEY, ["llama-3.3-70b-versatile"]),
        ("google", "Google", getattr(engine_settings, "GOOGLE_API_KEY", ""), ["gemini-2.0-flash"]),
        ("deepseek", "DeepSeek", getattr(engine_settings, "DEEPSEEK_API_KEY", ""), ["deepseek-chat"]),
    ]

    providers = [
        {"key": key, "name": name, "configured": bool(api_key), "models": models}
        for key, name, api_key, models in catalog
    ]
    configured = [p for p in providers if p["configured"]]

    return {
        "providers": providers,
        "default_provider": configured[0]["key"] if configured else None,
        "default_model": configured[0]["models"][0] if configured else None,
        "data_provider": engine_settings.DATA_PROVIDER,
        # Without a key the personas fall back to rule-based scoring rather
        # than failing, so the UI should say so plainly.
        "llm_available": bool(configured),
    }


# ── Analysis ────────────────────────────────────────────────────────────────
def _run_engine(req: AnalyzeRequest, tickers: list[str]) -> dict[str, Any]:
    from src.graph.workflow import run_hedge_fund  # noqa: PLC0415

    return run_hedge_fund(
        tickers=tickers,
        start_date=req.start_date,
        end_date=req.end_date,
        portfolio={"cash": req.cash, "positions": {}, "total_value": req.cash},
        model_name=req.model_name,
        model_provider=req.model_provider,
        show_reasoning=req.show_reasoning,
        use_llm=req.use_llm,
        personas=req.personas,
    )


def _shape_result(final_state: dict[str, Any], tickers: list[str]) -> dict[str, Any]:
    """Flatten the agent state into the shape the frontend renders."""
    data = final_state.get("data", {})
    signals = data.get("analyst_signals", {})

    flat: list[dict[str, Any]] = []
    for agent_id, agent_signals in signals.items():
        for sig in agent_signals or []:
            flat.append(
                {
                    "agent": agent_id,
                    "ticker": sig.get("ticker"),
                    "signal": sig.get("signal"),
                    "confidence": sig.get("confidence"),
                    "reasoning": sig.get("reasoning"),
                }
            )

    return {
        "tickers": tickers,
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "analyst_signals": _jsonable(signals),
        "signals": _jsonable(flat),
        "risk_adjusted_signals": _jsonable(data.get("risk_adjusted_signals", [])),
        "portfolio_output": _jsonable(data.get("portfolio_output", {})),
        "current_prices": _jsonable(data.get("current_prices", {})),
        "agents_run": sorted(signals.keys()),
    }


@router.post("/analyze")
async def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    """
    Run the full committee once and return every signal.

    The workflow is synchronous and does blocking network work during its
    prefetch, so it runs in a worker thread to keep the event loop free.
    """
    tickers = req.resolved_tickers()
    if not tickers:
        raise HTTPException(status_code=422, detail="Provide at least one ticker.")
    if len(tickers) > 10:
        raise HTTPException(status_code=422, detail="Analyze at most 10 tickers per request.")

    try:
        final_state = await asyncio.to_thread(_run_engine, req, tickers)
    except ImportError as exc:
        raise _engine_unavailable(exc)
    except Exception as exc:
        logger.exception("Analysis run failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    return _shape_result(final_state, tickers)


@router.post("/analyze/stream")
async def analyze_stream(req: AnalyzeRequest) -> StreamingResponse:
    """
    Same run, streamed as Server-Sent Events.

    A full committee takes minutes because of data prefetch and one LLM call
    per persona per ticker. Streaming each agent as it finishes means the page
    fills in progressively instead of showing a spinner until the end.
    """
    tickers = req.resolved_tickers()
    if not tickers:
        raise HTTPException(status_code=422, detail="Provide at least one ticker.")

    queue: asyncio.Queue[Optional[dict[str, Any]]] = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def emit(event: dict[str, Any]) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, event)

    def worker() -> None:
        try:
            from src.config.agents import ANALYST_CONFIG, PERSONA_CONFIG  # noqa: PLC0415
            from src.graph.workflow import _prefetch_all, create_workflow  # noqa: PLC0415

            start_date = req.start_date or (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
            end_date = req.end_date or datetime.now().strftime("%Y-%m-%d")

            planned = [node for node, _ in ANALYST_CONFIG.values()]
            if req.personas:
                wanted = set(PERSONA_CONFIG) if req.personas == ["all"] else set(req.personas)
                planned += [node for key, (node, _) in PERSONA_CONFIG.items() if key in wanted]

            emit(
                {
                    "type": "start",
                    "tickers": tickers,
                    "agents": planned + ["risk_manager", "portfolio_manager"],
                    "start_date": start_date,
                    "end_date": end_date,
                }
            )

            emit({"type": "status", "stage": "prefetch", "message": "Fetching prices, financials and news"})
            prefetched = _prefetch_all(tickers, start_date, end_date)
            emit({"type": "status", "stage": "prefetch", "message": "Market data ready"})

            graph = create_workflow(personas=req.personas).compile()
            initial_state = {
                "messages": [],
                "data": {
                    "tickers": tickers,
                    "portfolio": {"cash": req.cash, "positions": {}, "total_value": req.cash},
                    "start_date": start_date,
                    "end_date": end_date,
                    "analyst_signals": {},
                    "current_prices": {},
                    **prefetched,
                },
                "metadata": {
                    "model_name": req.model_name,
                    "model_provider": req.model_provider,
                    "show_reasoning": req.show_reasoning,
                    "use_llm": req.use_llm,
                },
            }

            merged: dict[str, Any] = {"data": {}, "metadata": {}}
            for update in graph.stream(initial_state, stream_mode="updates"):
                for node_name, node_output in (update or {}).items():
                    node_data = (node_output or {}).get("data", {}) or {}

                    # Each node returns analyst_signals holding only its own
                    # entry. A plain update would leave the last node's single
                    # signal as the whole result, so this key merges instead of
                    # replacing — the same contract the graph's reducer uses.
                    for key, value in node_data.items():
                        if key == "analyst_signals" and isinstance(value, dict):
                            merged["data"].setdefault("analyst_signals", {}).update(value)
                        else:
                            merged["data"][key] = value

                    payload: dict[str, Any] = {"type": "agent", "agent": node_name}
                    agent_signals = node_data.get("analyst_signals", {}) or {}
                    if agent_signals:
                        payload["signals"] = _jsonable(agent_signals)
                    if "risk_adjusted_signals" in node_data:
                        payload["risk_adjusted_signals"] = _jsonable(node_data["risk_adjusted_signals"])
                    if "portfolio_output" in node_data:
                        payload["portfolio_output"] = _jsonable(node_data["portfolio_output"])
                    emit(payload)

            emit({"type": "result", **_shape_result(merged, tickers)})
        except ImportError as exc:
            emit({"type": "error", "message": f"Analysis engine unavailable: {exc}"})
        except Exception as exc:  # noqa: BLE001
            logger.exception("Streaming analysis failed")
            emit({"type": "error", "message": str(exc)})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    async def event_source():
        task = asyncio.create_task(asyncio.to_thread(worker))
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20)
                except asyncio.TimeoutError:
                    # Proxies drop idle connections; a comment keeps it open
                    # without the client having to treat it as data.
                    yield ": keep-alive\n\n"
                    continue
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        finally:
            task.cancel()

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Paper trading ───────────────────────────────────────────────────────────
def _load_paper_state():
    from src.paper_trading.state import load_state  # noqa: PLC0415

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
    """Current paper book. Returns ``exists: false`` before the first run."""
    try:
        state = _load_paper_state()
    except ImportError as exc:
        raise _engine_unavailable(exc)
    except Exception as exc:
        logger.exception("Reading paper state failed")
        raise HTTPException(status_code=500, detail=f"Could not read the paper book: {exc}")

    if state is None:
        return {"exists": False, "cash": 0, "positions": [], "trades": [], "snapshots": [], "run_count": 0}
    return _serialize_paper_state(state)


def _run_paper_cycle(req: PaperTradeRequest) -> dict[str, Any]:
    from src.paper_trading.runner import PaperTradingRunner  # noqa: PLC0415
    from src.paper_trading.state import (  # noqa: PLC0415
        PaperTradingConfig,
        create_initial_state,
        load_state,
        save_state,
    )

    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state(str(_PAPER_STATE_PATH))

    if state is None:
        if not req.tickers:
            raise HTTPException(
                status_code=422,
                detail="No paper book exists yet. Send the tickers to trade so one can be opened.",
            )
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
    """Run one paper trading cycle: analyze, decide, execute, snapshot."""
    try:
        return await asyncio.to_thread(_run_paper_cycle, req)
    except HTTPException:
        raise
    except ImportError as exc:
        raise _engine_unavailable(exc)
    except Exception as exc:
        logger.exception("Paper trading cycle failed")
        raise HTTPException(status_code=500, detail=f"Paper trading cycle failed: {exc}")


@router.post("/paper-reset")
async def paper_reset() -> dict[str, Any]:
    """Delete the paper book. The next cycle opens a fresh one."""
    try:
        if _PAPER_STATE_PATH.exists():
            _PAPER_STATE_PATH.unlink()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not clear the paper book: {exc}")
    return {"success": True, "exists": False}


# ── Backtest ────────────────────────────────────────────────────────────────
def _run_backtest(req: BacktestRequest) -> dict[str, Any]:
    from src.backtest.metrics import compute_metrics  # noqa: PLC0415
    from src.backtest.portfolio_tracker import PortfolioTracker  # noqa: PLC0415
    from src.graph.workflow import run_hedge_fund  # noqa: PLC0415

    tickers = [t.upper() for t in req.tickers if t.strip()]
    if not tickers:
        raise HTTPException(status_code=422, detail="Provide at least one ticker to backtest.")

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

    executed: list[dict[str, Any]] = []
    for ticker, decision in decisions.items():
        action = str(decision.get("action", "hold")).lower()
        quantity = int(decision.get("quantity", 0) or 0)
        price = float(prices.get(ticker, 0) or 0)
        if action in ("buy", "sell") and quantity > 0 and price > 0:
            try:
                trade = tracker.execute_trade(ticker, action, quantity, price, end_date)
                if trade is not None:
                    executed.append(_jsonable(trade))
            except Exception as exc:  # noqa: BLE001
                logger.warning("Backtest trade rejected for %s: %s", ticker, exc)

    tracker.record_snapshot(end_date, prices)
    snapshots = tracker.snapshots

    try:
        metrics = _jsonable(compute_metrics(snapshots, tracker.trades))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Metric computation failed: %s", exc)
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
    """
    Run the committee over a historical window and apply its decisions to a
    tracked portfolio, so the result reflects commission and slippage rather
    than a frictionless paper return.
    """
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
    """Whether the engine imports and how many agents it can offer."""
    try:
        analyst_config, persona_config = _load_registry()
    except Exception as exc:
        return {"ok": False, "error": str(exc), "analysts": 0, "personas": 0}
    return {
        "ok": True,
        "analysts": len(analyst_config),
        "personas": len(persona_config),
        "engine_root": str(_ENGINE_ROOT),
    }
