from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json
import logging

async def analyze_macro(state: AgentState) -> dict:
    """Analyze macroeconomic variables, interest rate exposure, inflation, and Beta volatility."""
    info = state["market_data"]
    beta = info.get("beta", 1.0)
    sector = info.get("sector", "General")
    
    # Macro rule fallback
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if beta is not None:
        if beta > 1.3:
            reasons.append(f"High systematic volatility (Beta: {beta:.2f}) makes stock highly sensitive to market drawdowns")
            signal = "Bearish"
            confidence += 15
        elif beta < 0.75 and beta > 0:
            reasons.append(f"Low systemic risk profile (Beta: {beta:.2f}) offers strong portfolio defense in volatile regimes")
            signal = "Bullish"
            confidence += 15
        else:
            reasons.append(f"Neutral systematic risk (Beta: {beta:.2f}) tracks benchmark index closely")
            
    # Sector specific macro rules
    cyclical_sectors = ["Energy", "Basic Materials", "Financial Services", "Industrials"]
    defensive_sectors = ["Healthcare", "Utilities", "Consumer Defensive"]
    
    if sector in cyclical_sectors:
        reasons.append(f"Belongs to cyclical sector '{sector}', which depends heavily on macroeconomic growth phases")
    elif sector in defensive_sectors:
        reasons.append(f"Belongs to defensive sector '{sector}', which has historically shown resilience during inflation spikes")
        if signal != "Bearish": signal = "Bullish"
        
    reasoning = "; ".join(reasons)
    fallback_res = {"signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    # Try LLM
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are an expert Macroeconomic Analyst. Evaluate systemic risk and return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale"}""")
            user_msg = HumanMessage(content=f"Ticker: {state['ticker']}\nBeta: {beta}, Sector: {sector}")
            
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except Exception as e:
            logging.error(f"Macro LLM analysis failed: {e}")
            
    return fallback_res
