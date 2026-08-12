"""Risk analyst agent — LLM-powered risk assessment."""
from __future__ import annotations
import json, logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import AgentReport
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Senior Risk Analyst and Chief Risk Officer. Evaluate leverage, liquidity, tail risk, and business vulnerability."""

async def analyze_risk(state: AgentState) -> dict:
    market_data = state.get("market_data", {})
    ticker = state["ticker"]
    risk_data = {k: v for k, v in {
        "ticker": ticker, "debt_to_equity": market_data.get("debt_to_equity"),
        "beta": market_data.get("beta"), "pe_ratio": market_data.get("pe_ratio"),
        "profit_margins": market_data.get("profit_margins"), "operating_margins": market_data.get("operating_margins"),
        "revenue_growth": market_data.get("revenue_growth"), "current_price": market_data.get("current_price"),
    }.items() if v is not None}

    try:
        llm = get_llm("fast")
        report: AgentReport = await invoke_structured_with_retry(
            llm, AgentReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=f"Risk metrics for {ticker}:\n{json.dumps(risk_data)}")]
        )
        res = report.model_dump()
        res["agent_id"] = "risk_analyst"
        return res
    except Exception as e:
        logger.error(f"Risk agent failed for {ticker}: {e}")
        return {"agent_id": "risk_analyst", "signal": "Neutral", "confidence": 50, "reasoning": f"Risk analysis incomplete: {str(e)[:80]}.", "key_factors": ["Incomplete"], "data_points": risk_data}
