"""Macro analyst agent — LLM-powered macro regime analysis."""
from __future__ import annotations
import json, logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import AgentReport
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Senior Macroeconomic Strategist. Evaluate sector positioning, interest rate sensitivity, and macro risk."""

async def analyze_macro(state: AgentState) -> dict:
    market_data = state.get("market_data", {})
    ticker = state["ticker"]
    macro_data = {k: v for k, v in {
        "ticker": ticker, "sector": market_data.get("sector"),
        "beta": market_data.get("beta"), "exchange": state.get("exchange", "NSE")
    }.items() if v is not None}

    try:
        llm = get_llm("fast")
        report: AgentReport = await invoke_structured_with_retry(
            llm, AgentReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=f"Macro context for {ticker}:\n{json.dumps(macro_data)}")]
        )
        res = report.model_dump()
        res["agent_id"] = "macro_analyst"
        return res
    except Exception as e:
        logger.error(f"Macro agent failed for {ticker}: {e}")
        return {"agent_id": "macro_analyst", "signal": "Neutral", "confidence": 50, "reasoning": f"Macro analysis incomplete: {str(e)[:80]}.", "key_factors": ["Incomplete"], "data_points": macro_data}
