"""Valuation analyst agent — LLM-powered intrinsic value analysis."""
from __future__ import annotations
import json, logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import AgentReport
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Senior Valuation Analyst specializing in equity valuation.
Evaluate multiples (P/E, Fwd P/E, P/B, EV/EBITDA), growth alignment, and DCF expectations."""

async def analyze_valuation(state: AgentState) -> dict:
    market_data = state.get("market_data", {})
    ticker = state["ticker"]
    val_data = {k: v for k, v in {
        "ticker": ticker, "pe_ratio": market_data.get("pe_ratio"),
        "forward_pe": market_data.get("forward_pe"), "pb_ratio": market_data.get("pb_ratio"),
        "revenue_growth": market_data.get("revenue_growth"), "profit_margins": market_data.get("profit_margins"),
    }.items() if v is not None}

    try:
        llm = get_llm("fast")
        report: AgentReport = await invoke_structured_with_retry(
            llm, AgentReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=f"Valuation metrics for {ticker}:\n{json.dumps(val_data)}")]
        )
        res = report.model_dump()
        res["agent_id"] = "valuation_analyst"
        return res
    except Exception as e:
        logger.error(f"Valuation agent failed for {ticker}: {e}")
        return {"agent_id": "valuation_analyst", "signal": "Neutral", "confidence": 50, "reasoning": f"Valuation incomplete: {str(e)[:80]}.", "key_factors": ["Incomplete"], "data_points": val_data}
