"""Risk aggregator agent — LLM-powered synthesis of specialist signals with retry backoff."""
from __future__ import annotations
import json, logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import RiskAssessment
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Chief Risk Officer synthesizing signals from specialist analysts.
Produce a risk-adjusted consensus, identify conflicts, and recommend position sizing guidance."""

async def aggregate_risk(state: AgentState) -> dict:
    analyst_reports = state.get("analyst_reports", {})
    ticker = state["ticker"]

    if not analyst_reports:
        return {"risk_assessment": {"consensus_signal": "Neutral", "consensus_confidence": 50, "signal_agreement": 0.5, "key_risks": [], "risk_reward_ratio": "Moderate", "position_sizing_guidance": "moderate", "dissenting_views": []}}

    report_lines = [f"- {k}: Signal={v.get('signal')}, Conf={v.get('confidence')}%, Reasoning: {v.get('reasoning')}" for k, v in analyst_reports.items() if isinstance(v, dict)]

    try:
        llm = get_llm("reasoning")
        assessment: RiskAssessment = await invoke_structured_with_retry(
            llm, RiskAssessment, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=f"Synthesize risk consensus for {ticker}:\n" + "\n".join(report_lines))]
        )
        return {"risk_assessment": assessment.model_dump()}
    except Exception as e:
        logger.error(f"Risk aggregator failed for {ticker}: {e}")
        return {"risk_assessment": {"consensus_signal": "Neutral", "consensus_confidence": 50, "signal_agreement": 0.5, "key_risks": [str(e)[:80]], "risk_reward_ratio": "Moderate", "position_sizing_guidance": "moderate", "dissenting_views": []}}
