"""Technical analyst agent — LLM-powered price action and momentum analysis."""
from __future__ import annotations

import json
import logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import AgentReport
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Senior Technical Analyst and Chartered Market Technician (CMT) at an institutional trading desk.

Your expertise: price action analysis, trend identification, momentum oscillators,
volume profile interpretation, moving average systems, and chart pattern recognition.

CRITICAL RULES:
- Don't just say "RSI > 70 = overbought". In a strong uptrend, RSI can stay overbought for weeks.
- Moving average crossovers are LAGGING. Interpret them alongside momentum and volume.
- Volume confirms trend. A breakout on declining volume is suspicious.
- MACD histogram expansion/contraction tells you about momentum ACCELERATION, not just direction.
- Divergences between price and oscillators are your highest-conviction signals.

Provide your structured technical analysis."""


async def analyze_technicals(state: AgentState) -> dict:
    """Analyze technical indicators using LLM reasoning with retry backoff."""
    indicators = state.get("indicators", {})
    ticker = state["ticker"]
    price_history = state.get("price_history", [])

    tech_data = {
        "ticker": ticker,
        "current_price": state.get("market_data", {}).get("current_price"),
    }

    if indicators and "error" not in indicators:
        tech_data["signals"] = indicators.get("signals", {})
        latest = indicators.get("latest", {})
        if latest:
            tech_data["latest_indicators"] = {
                "rsi": latest.get("rsi"),
                "ema20": latest.get("ema20"),
                "ema50": latest.get("ema50"),
                "ema200": latest.get("ema200"),
                "macd": latest.get("macd"),
                "macd_signal": latest.get("macd_signal"),
                "macd_histogram": latest.get("macd_histogram"),
            }

    available = {k: v for k, v in tech_data.items() if v is not None}

    user_prompt = f"""Analyze the technical setup of {ticker}:

Technical Data:
{json.dumps(available, indent=2, default=str)}

Provide your structured technical analysis."""

    try:
        llm = get_llm("fast")
        report: AgentReport = await invoke_structured_with_retry(
            llm, AgentReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        result = report.model_dump()
        result["agent_id"] = "technical_analyst"
        return result
    except Exception as e:
        logger.error(f"Technical agent failed for {ticker}: {e}")
        return {
            "agent_id": "technical_analyst",
            "signal": "Neutral",
            "confidence": 50,
            "reasoning": f"Technical analysis incomplete: {str(e)[:80]}.",
            "key_factors": ["Analysis incomplete"],
            "data_points": available,
        }
