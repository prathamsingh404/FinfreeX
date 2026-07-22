from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json
import logging

async def analyze_risk(state: AgentState) -> dict:
    """Analyze debt levels, coverage, beta volatility, and macro risks."""
    info = state["market_data"]
    debt_eq = info.get("debt_to_equity")
    current_ratio = info.get("current_ratio")
    beta = info.get("beta")
    
    # Risk rules fallback
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if debt_eq is not None:
        if debt_eq > 1.5:
            reasons.append(f"High debt-to-equity ratio of {debt_eq:.2f} increases financial risk")
            signal = "Bearish"
            confidence += 15
        elif debt_eq < 0.5:
            reasons.append(f"Low leverage with debt-to-equity of {debt_eq:.2f} signals strong balance sheet stability")
            signal = "Bullish"
            confidence += 10
            
    if current_ratio is not None:
        if current_ratio < 1.0:
            reasons.append(f"Liquidity risk detected: Current ratio ({current_ratio:.2f}) is below 1.0")
            signal = "Bearish"
            confidence += 15
        elif current_ratio > 1.8:
            reasons.append(f"Healthy short-term liquidity with current ratio of {current_ratio:.2f}")
            confidence += 5
            
    if beta is not None:
        if beta > 1.3:
            reasons.append(f"High beta of {beta:.2f} indicates elevated market volatility exposure")
            if signal != "Bearish": signal = "Neutral"
            confidence += 5
        elif beta < 0.8:
            reasons.append(f"Low beta of {beta:.2f} provides defensiveness against market downturns")
            if signal != "Bearish": signal = "Bullish"
            confidence += 10
            
    reasoning = "; ".join(reasons) if reasons else "Balance sheet and risk metrics are in stable ranges."
    fallback_res = {"signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    # Try LLM
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are an expert Risk Analyst. Analyze the financial risk metrics and return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale"}""")
            user_msg = HumanMessage(content=f"Ticker: {state['ticker']}\nDebt/Equity: {debt_eq}, Current Ratio: {current_ratio}, Beta: {beta}")
            
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except Exception as e:
            logging.error(f"Risk LLM analysis failed: {e}")
            
    return fallback_res
