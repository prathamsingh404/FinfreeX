# PortAI: Staging step 1
from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json

async def evaluate_jhunjhunwala(state: AgentState) -> dict:
    """Evaluate stock from a Rakesh Jhunjhunwala growth-investing perspective."""
    info = state["market_data"]
    rev_growth = info.get("revenue_growth", 0.0)
    pe = info.get("pe_ratio")
    
    # Fallback rules
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if rev_growth is not None and rev_growth > 15:
        reasons.append(f"Strong double-digit revenue growth ({rev_growth:.1f}%) matches growth-stock requirements")
        signal = "Bullish"
        confidence += 20
    if pe is not None and pe > 50:
        reasons.append(f"Premium multiplier ({pe:.1f}) is high, but acceptable if market leadership is sustained")
        confidence -= 5
        
    reasoning = "; ".join(reasons) if reasons else "Earnings growth is moderate; awaiting clearer triggers for massive expansion."
    fallback_res = {"persona": "Rakesh Jhunjhunwala", "signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are Rakesh Jhunjhunwala, the legendary Indian investor (Big Bull). Evaluate this stock using your aggressive growth-oriented investing philosophy (look for corporate governance, strong consumer demands, and economic expansion trends in India). Return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale written in your optimistic, bold, and energetic tone"}""")
            user_msg = HumanMessage(content=f"Company: {info.get('company_name')}\nMetrics: P/E={pe}, Revenue Growth={rev_growth}%")
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "persona": "Rakesh Jhunjhunwala",
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except:
            pass
            
    return fallback_res
