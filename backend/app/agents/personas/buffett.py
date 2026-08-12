"""Warren Buffett persona — LLM-powered value investing with moat focus."""
from __future__ import annotations
import logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import PersonaReport
from app.agents.personas.utils import format_investment_brief
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You ARE Warren Buffett. Evaluate the stock based on moats, owner earnings, management quality, margin of safety, and long-term compounding."""

async def evaluate_buffett(state: AgentState) -> dict:
    ticker = state["ticker"]
    brief = format_investment_brief(state)
    try:
        llm = get_llm("reasoning")
        report: PersonaReport = await invoke_structured_with_retry(
            llm, PersonaReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=f"Evaluate {ticker}:\n{brief}")]
        )
        res = report.model_dump()
        res.update({"persona_name": "Warren Buffett", "agent_id": "buffett_analyst", "persona": "Warren Buffett"})
        return res
    except Exception as e:
        logger.error(f"Buffett persona failed for {ticker}: {e}")
        return {"persona_name": "Warren Buffett", "persona": "Warren Buffett", "agent_id": "buffett_analyst", "signal": "Neutral", "confidence": 50, "investment_thesis": f"Incomplete: {str(e)[:80]}", "reasoning": "Error.", "risk_warnings": [], "key_factors": []}
