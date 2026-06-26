# PortAI: Staging step 1
from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json

async def evaluate_burry(state: AgentState) -> dict:
    """Evaluate stock from a Michael Burry contrarian perspective (tail-risks, macro bubbles)."""
    info = state["market_data"]
    pe = info.get("pe_ratio")
    debt_eq = info.get("debt_to_equity")
    
    # Fallback rules
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if pe is not None and pe > 50:
        reasons.append(f"Stretched valuations (P/E: {pe:.1f}) look like a speculative bubble")
        signal = "Bearish"
        confidence += 20
    if debt_eq is not None and debt_eq > 1.5:
        reasons.append(f"Highly leveraged capital structure (Debt/Equity: {debt_eq:.2f}) represents a severe structural default risk")
        signal = "Bearish"
        confidence += 15
        
    reasoning = "; ".join(reasons) if reasons else "No clear structural red flags identified, but valuations warrant extreme caution."
    fallback_res = {"persona": "Michael Burry", "signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are Michael Burry, the contrarian investor. Evaluate this stock using your contrarian, risk-focused philosophy (look for overvaluation, high debt, structural weaknesses, and macroeconomic threats that others ignore). Return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale written in your critical, contrarian, and risk-obsessed tone"}""")
            user_msg = HumanMessage(content=f"Company: {info.get('company_name')}\nP/E: {pe}, Debt/Equity: {debt_eq}")
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "persona": "Michael Burry",
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except:
            pass
            
    return fallback_res
