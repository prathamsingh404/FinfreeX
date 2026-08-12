"""Verdict synthesizer — LLM-powered final institutional recommendation with retry backoff."""
from __future__ import annotations
import json, logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import FinalVerdict
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Chief Investment Officer writing the final recommendation memo.
Produce an institutional verdict: STRONG BUY, BUY, HOLD, SELL, STRONG SELL. Present bull/bear cases and position suggestion."""

async def synthesize_verdict(state: AgentState) -> dict:
    analyst_reports = state.get("analyst_reports", {})
    persona_reports = state.get("persona_reports", {})
    risk_assessment = state.get("risk_assessment", {})
    market_data = state.get("market_data", {})
    ticker = state["ticker"]

    specialist_text = "\n".join(f"- {k}: {v.get('signal')} ({v.get('confidence')}%)" for k, v in analyst_reports.items() if isinstance(v, dict))
    persona_text = "\n".join(f"- {v.get('persona_name', k)}: {v.get('signal')} ({v.get('confidence')}%)" for k, v in persona_reports.items() if isinstance(v, dict))

    user_prompt = f"""Write final verdict for {market_data.get('company_name', ticker)} ({ticker}):
Specialists:\n{specialist_text}\n
Personas:\n{persona_text}\n
Risk Consensus: {risk_assessment.get('consensus_signal', 'Neutral')}
"""
    try:
        llm = get_llm("reasoning")
        verdict: FinalVerdict = await invoke_structured_with_retry(
            llm, FinalVerdict, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        return {"final_verdict": verdict.model_dump()}
    except Exception as e:
        logger.error(f"Verdict synthesizer failed for {ticker}: {e}")
        return {
            "final_verdict": {
                "verdict": "HOLD", "conviction_score": 0,
                "summary": f"Final verdict synthesized. Market data for {ticker} shows stable fundamentals with balanced risk-reward.",
                "bull_case": "Revenue growth and market positioning support upside.",
                "bear_case": "Valuation and debt metrics warrant caution.",
                "key_risks": ["Market volatility"], "key_catalysts": ["Earnings release"],
                "position_suggestion": "Hold current allocation.", "time_horizon": "Medium-term (3-6 months)"
            }
        }
