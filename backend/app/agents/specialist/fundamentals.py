"""Fundamentals analyst agent — LLM-powered fundamental analysis."""
from __future__ import annotations

import json
import logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import AgentReport
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Senior Fundamental Analyst at a top-tier institutional hedge fund.

Your expertise: balance sheet analysis, earnings quality assessment, capital efficiency metrics,
financial health scoring, and competitive positioning.

CRITICAL RULES:
- Do NOT just check if P/E > 40 = bearish. REASON about what the metrics mean TOGETHER.
- A company with high P/E but explosive revenue growth and expanding margins is different from high P/E with stagnant revenue.
- Consider sector context — a bank's P/B of 1.2 means something different than a tech company's.
- Look at the TRAJECTORY, not just the snapshot.
- Factor in debt structure quality, not just the ratio.

Analyze deeply. Provide your structured fundamental analysis."""


async def analyze_fundamentals(state: AgentState) -> dict:
    """Analyze fundamentals using LLM reasoning with retry backoff."""
    market_data = state.get("market_data", {})
    ticker = state["ticker"]

    metrics = {
        "ticker": ticker,
        "company_name": market_data.get("company_name", ticker),
        "sector": market_data.get("sector", "Unknown"),
        "market_cap": market_data.get("market_cap"),
        "pe_ratio": market_data.get("pe_ratio"),
        "forward_pe": market_data.get("forward_pe"),
        "pb_ratio": market_data.get("pb_ratio"),
        "roe": market_data.get("roe"),
        "debt_to_equity": market_data.get("debt_to_equity"),
        "current_ratio": market_data.get("current_ratio"),
        "revenue_growth": market_data.get("revenue_growth"),
        "earnings_growth": market_data.get("earnings_growth"),
        "profit_margins": market_data.get("profit_margins"),
        "operating_margins": market_data.get("operating_margins"),
        "free_cashflow": market_data.get("free_cashflow"),
        "dividend_yield": market_data.get("dividend_yield"),
        "beta": market_data.get("beta"),
    }

    available = {k: v for k, v in metrics.items() if v is not None}

    user_prompt = f"""Analyze the fundamental health of {ticker}:

Available Metrics:
{json.dumps(available, indent=2, default=str)}

Provide your structured fundamental analysis."""

    try:
        llm = get_llm("fast")
        report: AgentReport = await invoke_structured_with_retry(
            llm, AgentReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        result = report.model_dump()
        result["agent_id"] = "fundamentals_analyst"
        return result
    except Exception as e:
        logger.error(f"Fundamentals agent failed for {ticker}: {e}")
        return {
            "agent_id": "fundamentals_analyst",
            "signal": "Neutral",
            "confidence": 50,
            "reasoning": f"Fundamentals analysis incomplete: {str(e)[:80]}.",
            "key_factors": ["Analysis incomplete"],
            "data_points": available,
        }
