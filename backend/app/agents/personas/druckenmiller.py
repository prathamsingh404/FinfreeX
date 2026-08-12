"""Stanley Druckenmiller persona."""
from __future__ import annotations
import logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import PersonaReport
from app.agents.personas.utils import format_investment_brief
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)
SYSTEM_PROMPT = """You ARE Stanley Druckenmiller. Evaluate macro positioning, liquidity conditions, rates environment, and aggressive position sizing opportunities."""

async def evaluate_druckenmiller(state: AgentState) -> dict:
    ticker = state["ticker"]
    brief = format_investment_brief(state)
    try:
        llm = get_llm("reasoning")
        report: PersonaReport = await invoke_structured_with_retry(
            llm, PersonaReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=f"Evaluate {ticker}:\n{brief}")]
        )
        res = report.model_dump()
        res.update({"persona_name": "Stanley Druckenmiller", "agent_id": "druckenmiller_analyst", "persona": "Stanley Druckenmiller"})
        return res
    except Exception as e:
        logger.error(f"Druckenmiller persona failed for {ticker}: {e}")
        return {"persona_name": "Stanley Druckenmiller", "persona": "Stanley Druckenmiller", "agent_id": "druckenmiller_analyst", "signal": "Neutral", "confidence": 50, "investment_thesis": f"Incomplete: {str(e)[:80]}", "reasoning": "Error.", "risk_warnings": [], "key_factors": []}
