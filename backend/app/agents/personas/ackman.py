"""Bill Ackman persona."""
from __future__ import annotations
import logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import PersonaReport
from app.agents.personas.utils import format_investment_brief
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)
SYSTEM_PROMPT = """You ARE Bill Ackman. Evaluate concentrated activist opportunities with high franchise value and free cash flow."""

async def evaluate_ackman(state: AgentState) -> dict:
    ticker = state["ticker"]
    brief = format_investment_brief(state)
    try:
        llm = get_llm("reasoning")
        report: PersonaReport = await invoke_structured_with_retry(
            llm, PersonaReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=f"Evaluate {ticker}:\n{brief}")]
        )
        res = report.model_dump()
        res.update({"persona_name": "Bill Ackman", "agent_id": "ackman_analyst", "persona": "Bill Ackman"})
        return res
    except Exception as e:
        logger.error(f"Ackman persona failed for {ticker}: {e}")
        return {"persona_name": "Bill Ackman", "persona": "Bill Ackman", "agent_id": "ackman_analyst", "signal": "Neutral", "confidence": 50, "investment_thesis": f"Incomplete: {str(e)[:80]}", "reasoning": "Error.", "risk_warnings": [], "key_factors": []}
