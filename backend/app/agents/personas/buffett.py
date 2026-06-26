from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json

async def evaluate_buffett(state: AgentState) -> dict:
    """Evaluate stock from a Warren Buffett value-investing perspective (margins, moats, pricing power)."""
    info = state["market_data"]
    pe = info.get("pe_ratio")
    roe = info.get("roe")
    fcf = info.get("free_cashflow")
    
    # Rule fallback
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if roe is not None and roe > 18:
        reasons.append(f"Outstanding ROE ({roe:.1f}%) signals high capital allocation efficiency and a corporate moat")
        signal = "Bullish"
        confidence += 20
    if fcf is not None and fcf > 0:
        reasons.append("Positive free cash flow suggests healthy operational self-funding capability")
        if signal != "Bearish": signal = "Bullish"
        confidence += 10
    if pe is not None and pe > 40:
        reasons.append(f"High P/E multiplier ({pe:.1f}) lacks the margin of safety required for value accumulation")
        signal = "Bearish"
        confidence += 15
        
    reasoning = "; ".join(reasons) if reasons else "Company metrics are moderately attractive but lack strong moat indicators."
    fallback_res = {"persona": "Warren Buffett", "signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are Warren Buffett, the legendary value investor. Evaluate this stock using your investing philosophy (focus on durable competitive moats, consistent profitability, pricing power, and reasonable valuations). Return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale written in your direct, wise tone"}""")
            user_msg = HumanMessage(content=f"Company: {info.get('company_name')}\nMetrics: P/E={pe}, ROE={roe}%, FCF={fcf}")
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "persona": "Warren Buffett",
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except:
            pass
            
    return fallback_res
