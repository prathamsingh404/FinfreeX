"""Unified agent orchestration graph — LangGraph-powered analysis pipeline.

Architecture:
    START ──┬── fundamentals ──┐
            ├── technical    ──┤
            ├── sentiment    ──┤  (parallel fan-out)
            ├── valuation    ──┤
            ├── macro        ──┤
            └── risk         ──┘
                               ↓
                         risk_aggregator
                               ↓
            ┌── buffett ───────┤
            ├── burry ─────────┤  (parallel fan-out, selected personas)
            ├── graham ────────┤
            └── ... personas ──┘
                               ↓
                       verdict_synthesizer
                               ↓
                              END

Both endpoints (/api/ai/analyze and /api/stratton/analyze) funnel into this graph.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

from app.agents.state import AgentState
from app.agents.specialist.fundamentals import analyze_fundamentals
from app.agents.specialist.technical import analyze_technicals
from app.agents.specialist.sentiment import analyze_sentiment_agent
from app.agents.specialist.valuation import analyze_valuation
from app.agents.specialist.macro import analyze_macro
from app.agents.specialist.risk import analyze_risk
from app.agents.risk_aggregator import aggregate_risk
from app.agents.verdict_synthesizer import synthesize_verdict
from app.agents.personas import PERSONA_REGISTRY, DEFAULT_PERSONAS

from app.services.market_data import get_quote, get_fundamentals
from app.services.technical_service import compute_indicators
from app.services.news_service import get_aggregated_news

logger = logging.getLogger(__name__)

# ── Specialist registry ──────────────────────────────────────────────────
SPECIALIST_AGENTS = {
    "Fundamentals Specialist": analyze_fundamentals,
    "Technical Momentum Specialist": analyze_technicals,
    "Sentiment & Flow Specialist": analyze_sentiment_agent,
    "Valuation Model Specialist": analyze_valuation,
    "Macro Regime Specialist": analyze_macro,
    "Risk Specialist": analyze_risk,
}


async def run_analysis_stream(
    ticker: str,
    exchange: str = "NSE",
    active_personas: Optional[List[str]] = None,
) -> AsyncGenerator[dict, None]:
    """Execute the full multi-agent analysis pipeline with streaming.

    Yields real-time execution steps and completed reports as SSE events.
    """
    if active_personas is None:
        active_personas = list(DEFAULT_PERSONAS)

    start_time = datetime.now()

    yield {"type": "status", "message": f"Initializing analysis pipeline for {ticker} ({exchange})..."}

    # ── Phase 1: Data fetching ───────────────────────────────────────
    yield {"type": "status", "message": "Fetching market data, indicators, and news..."}
    try:
        fetch_tasks = [
            get_quote(ticker, exchange),
            get_fundamentals(ticker, exchange),
            compute_indicators(ticker, exchange),
            get_aggregated_news(ticker, 10),
        ]
        quote, fundamentals, indicators, news = await asyncio.gather(*fetch_tasks)
    except Exception as e:
        yield {"type": "error", "message": f"Data fetch failed: {str(e)}"}
        return

    if isinstance(quote, dict) and "error" in quote:
        yield {"type": "error", "message": f"Failed to get quote data: {quote['error']}"}
        return

    # Merge data
    market_data = {**quote, **fundamentals} if isinstance(fundamentals, dict) else quote

    yield {"type": "market_data", "data": market_data}

    # Build initial state
    state: Dict[str, Any] = {
        "ticker": ticker,
        "exchange": exchange,
        "market_data": market_data,
        "price_history": [],
        "indicators": indicators if isinstance(indicators, dict) else {},
        "news": news if isinstance(news, list) else [],
        "active_personas": active_personas,
        "analyst_reports": {},
        "persona_reports": {},
        "risk_assessment": {},
        "final_verdict": {},
        "metadata": {
            "start_time": start_time.isoformat(),
            "exchange": exchange,
        },
    }

    # ── Phase 2: Specialist agents (parallel execution) ─────────────
    yield {"type": "status", "message": "Launching specialist analyst agents..."}

    specialist_tasks = {}
    for name, agent_func in SPECIALIST_AGENTS.items():
        specialist_tasks[name] = asyncio.create_task(agent_func(state))
        await asyncio.sleep(0.2)  # Stagger launches to prevent burst TPM limits

    # Collect results as they complete
    for name, task in specialist_tasks.items():
        try:
            result = await task
            state["analyst_reports"][name] = result
            yield {"type": "specialist", "agent": name, "result": result}
        except Exception as e:
            logger.error(f"Specialist {name} failed: {e}")
            fallback = {
                "agent_id": name,
                "signal": "Neutral",
                "confidence": 50,
                "reasoning": f"Agent analysis incomplete: {str(e)[:80]}",
                "key_factors": ["Data analysis incomplete"],
                "data_points": {},
            }
            state["analyst_reports"][name] = fallback
            yield {"type": "specialist", "agent": name, "result": fallback}

    # ── Phase 3: Risk aggregation ────────────────────────────────────
    yield {"type": "status", "message": "Synthesizing risk-adjusted consensus..."}
    try:
        risk_result = await aggregate_risk(state)
        state["risk_assessment"] = risk_result.get("risk_assessment", {})
        yield {"type": "risk_assessment", "result": state["risk_assessment"]}
    except Exception as e:
        logger.error(f"Risk aggregation failed: {e}")
        state["risk_assessment"] = {"consensus_signal": "Neutral", "consensus_confidence": 50}
        yield {"type": "risk_assessment", "result": state["risk_assessment"]}

    # ── Phase 4: Persona agents ───────────────────────────────────────
    yield {"type": "status", "message": f"Running {len(active_personas)} investor persona agents..."}

    persona_tasks = {}
    for persona_key in active_personas:
        if persona_key in PERSONA_REGISTRY:
            display_name, _, evaluate_func = PERSONA_REGISTRY[persona_key]
            persona_tasks[persona_key] = (display_name, asyncio.create_task(evaluate_func(state)))
            await asyncio.sleep(0.3)  # Stagger persona launches

    for persona_key, (display_name, task) in persona_tasks.items():
        try:
            result = await task
            state["persona_reports"][persona_key] = result
            yield {"type": "persona", "persona": display_name, "result": result}
        except Exception as e:
            logger.error(f"Persona {display_name} failed: {e}")
            fallback = {
                "persona_name": display_name,
                "persona": display_name,
                "agent_id": f"{persona_key}_analyst",
                "signal": "Neutral",
                "confidence": 50,
                "investment_thesis": f"Analysis incomplete: {str(e)[:80]}",
                "reasoning": "Evaluation incomplete due to transient error.",
                "risk_warnings": ["Incomplete evaluation"],
                "key_factors": [],
            }
            state["persona_reports"][persona_key] = fallback
            yield {"type": "persona", "persona": display_name, "result": fallback}

    # ── Phase 5: Final verdict synthesis ─────────────────────────────
    yield {"type": "status", "message": "Synthesizing institutional verdict..."}
    try:
        verdict_result = await synthesize_verdict(state)
        state["final_verdict"] = verdict_result.get("final_verdict", {})
    except Exception as e:
        logger.error(f"Verdict synthesis failed: {e}")
        state["final_verdict"] = {
            "verdict": "HOLD",
            "conviction_score": 0,
            "summary": f"Verdict synthesis incomplete: {str(e)[:80]}",
            "bull_case": "See individual reports.",
            "bear_case": "See individual reports.",
            "key_risks": ["Synthesis incomplete"],
            "key_catalysts": [],
            "position_suggestion": "Conservative stance recommended.",
            "time_horizon": "Medium-term",
        }

    elapsed = (datetime.now() - start_time).total_seconds()
    state["final_verdict"]["analysis_time_seconds"] = round(elapsed, 1)
    state["final_verdict"]["agents_run"] = list(state["analyst_reports"].keys()) + list(state["persona_reports"].keys())

    yield {"type": "final_verdict", "result": state["final_verdict"]}


async def run_analysis_sync(
    ticker: str,
    exchange: str = "NSE",
    active_personas: Optional[List[str]] = None,
) -> dict:
    """Run the full analysis and return the complete result (non-streaming)."""
    result = {
        "analyst_reports": {},
        "persona_reports": {},
        "risk_assessment": {},
        "final_verdict": {},
        "market_data": {},
    }

    async for event in run_analysis_stream(ticker, exchange, active_personas):
        event_type = event.get("type")
        if event_type == "market_data":
            result["market_data"] = event.get("data", {})
        elif event_type == "specialist":
            result["analyst_reports"][event["agent"]] = event["result"]
        elif event_type == "risk_assessment":
            result["risk_assessment"] = event["result"]
        elif event_type == "persona":
            result["persona_reports"][event["persona"]] = event["result"]
        elif event_type == "final_verdict":
            result["final_verdict"] = event["result"]
        elif event_type == "error":
            result["error"] = event.get("message")

    return result
