"""Sentiment analyst agent — LLM-powered news and market narrative analysis."""
from __future__ import annotations

import json
import logging
from app.agents.state import AgentState
from app.agents.llm import get_llm, invoke_structured_with_retry
from app.agents.models import AgentReport
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Senior Sentiment & Flow Analyst at a quantitative hedge fund.

Your expertise: news sentiment interpretation, institutional flow analysis, market narrative tracking.

Provide your structured sentiment analysis."""


async def analyze_sentiment_agent(state: AgentState) -> dict:
    """Analyze news sentiment using LLM reasoning with retry backoff."""
    news = state.get("news", [])
    ticker = state["ticker"]
    market_data = state.get("market_data", {})

    if news:
        headlines = []
        for i, item in enumerate(news[:6]):
            title = item.get("title", "") if isinstance(item, dict) else str(item)
            headlines.append(f"{i+1}. {title}")
        news_text = "\n".join(headlines)
    else:
        news_text = "No recent news headlines."

    user_prompt = f"""Analyze the sentiment landscape for {ticker} ({market_data.get('company_name', ticker)}):

News Headlines:
{news_text}

Provide your structured sentiment analysis."""

    try:
        llm = get_llm("fast")
        report: AgentReport = await invoke_structured_with_retry(
            llm, AgentReport, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
        )
        result = report.model_dump()
        result["agent_id"] = "sentiment_analyst"
        return result
    except Exception as e:
        logger.error(f"Sentiment agent failed for {ticker}: {e}")
        return {
            "agent_id": "sentiment_analyst",
            "signal": "Neutral",
            "confidence": 50,
            "reasoning": f"Sentiment analysis incomplete: {str(e)[:80]}.",
            "key_factors": ["Analysis incomplete"],
            "data_points": {},
        }
