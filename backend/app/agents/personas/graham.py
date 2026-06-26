# PortAI: Staging step 1
from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json

async def evaluate_graham(state: AgentState) -> dict:
    """Evaluate stock from a Benjamin Graham margin-of-safety value perspective."""
    info = state["market_data"]
    pe = info.get("pe_ratio")
    pb = info.get("pb_ratio")
    
    # Fallback rules
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if pe is not None and pb is not None:
        graham_number = pe * pb
        if graham_number < 22.5 and pe > 0 and pb > 0:
            reasons.append(f"Graham multiplier (PE*PB = {graham_number:.2f}) is below 22.5 threshold, indicating strong margin of safety")
            signal = "Bullish"
            confidence += 25
        elif graham_number > 50.0:
            reasons.append(f"Graham multiplier ({graham_number:.2f}) is high, indicating an expensive equity purchase")
            signal = "Bearish"
            confidence += 15
            
    reasoning = "; ".join(reasons) if reasons else "Multiple valuations are too high or lack of book value coordinates."
    fallback_res = {"persona": "Benjamin Graham", "signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are Benjamin Graham, the father of value investing. Evaluate this stock using your strict margin of safety investing philosophy (low P/E, low P/B, debt security, and solid assets backing). Return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale written in your academic, conservative, and analytical tone"}""")
            user_msg = HumanMessage(content=f"Company: {info.get('company_name')}\nP/E: {pe}, P/B: {pb}")
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "persona": "Benjamin Graham",
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except:
            pass
            
    return fallback_res
