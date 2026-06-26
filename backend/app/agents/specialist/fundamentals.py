# PortAI: Staging step 1
from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json
import logging

async def analyze_fundamentals(state: AgentState) -> dict:
    """Analyze company balance sheet, earnings growth, and financial strength."""
    m_cap = state["market_data"].get("market_cap", 0)
    pe = state["market_data"].get("pe_ratio")
    pb = state["market_data"].get("pb_ratio")
    roe = state["market_data"].get("roe")
    debt_eq = state["market_data"].get("debt_to_equity")
    rev_growth = state["market_data"].get("revenue_growth")
    
    # Rules-based fallback calculation
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if pe is not None:
        if pe < 20 and pe > 0:
            reasons.append(f"Low P/E ratio ({pe:.2f}) indicates potential value")
            confidence += 15
        elif pe > 45:
            reasons.append(f"High P/E ratio ({pe:.2f}) indicates rich valuations")
            confidence += 15
            signal = "Bearish"
            
    if roe is not None:
        if roe > 15:
            reasons.append(f"Strong ROE of {roe:.2f}% indicates high capital efficiency")
            confidence += 10
            if signal != "Bearish": signal = "Bullish"
        elif roe < 8:
            reasons.append(f"Weak ROE of {roe:.2f}% indicates poor capital returns")
            confidence += 10
            signal = "Bearish"
            
    if debt_eq is not None:
        if debt_eq < 1.0:
            reasons.append(f"Comfortable debt-to-equity ratio ({debt_eq:.2f})")
        else:
            reasons.append(f"Highly leveraged with debt-to-equity of {debt_eq:.2f}")
            signal = "Bearish"
            confidence += 10
            
    reasoning = "; ".join(reasons) if reasons else "Fundamentals show stable, in-line industry averages."
    if signal == "Bullish" and confidence > 70:
        signal = "Bullish"
    elif signal == "Bearish" and confidence > 70:
        signal = "Bearish"
    else:
        signal = "Neutral"
        
    fallback_res = {"signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    # Try LLM
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are an expert Fundamental Analyst. Analyze the fundamental metrics and return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale"}""")
            user_msg = HumanMessage(content=f"Ticker: {state['ticker']}\nMetrics: Market Cap={m_cap}, P/E={pe}, P/B={pb}, ROE={roe}%, Debt/Equity={debt_eq}, Revenue Growth={rev_growth}%")
            
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except Exception as e:
            logging.error(f"Fundamentals LLM analysis failed: {e}")
            
    return fallback_res
