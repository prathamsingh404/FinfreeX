from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json
import logging

async def analyze_valuation(state: AgentState) -> dict:
    """Analyze stock intrinsic value, forward margins, and multiple premiums."""
    info = state["market_data"]
    pe = info.get("pe_ratio")
    fwd_pe = info.get("forward_pe")
    pb = info.get("pb_ratio")
    dividend_yield = info.get("dividend_yield")
    
    # Valuation rules fallback
    signal = "Neutral"
    confidence = 50
    reasons = []
    
    if pe is not None and fwd_pe is not None:
        if fwd_pe < pe * 0.85 and fwd_pe > 0:
            reasons.append(f"Forward P/E ({fwd_pe:.1f}) is substantially below trailing P/E ({pe:.1f}), projecting earnings growth")
            signal = "Bullish"
            confidence += 15
        elif fwd_pe > pe * 1.15:
            reasons.append(f"Forward P/E ({fwd_pe:.1f}) exceeds trailing P/E ({pe:.1f}), signaling expected earnings contraction")
            signal = "Bearish"
            confidence += 15
        else:
            reasons.append(f"Valuation stable. Trailing P/E: {pe:.1f}, Forward P/E: {fwd_pe:.1f}")
            
    if pb is not None:
        if pb < 1.5 and pb > 0:
            reasons.append(f"Low price-to-book ratio ({pb:.2f}) indicates asset undervaluation")
            if signal != "Bearish": signal = "Bullish"
            confidence += 10
            
    if dividend_yield is not None:
        if dividend_yield > 4.0:
            reasons.append(f"High dividend yield ({dividend_yield:.2f}%) provides valuation support")
            if signal != "Bearish": signal = "Bullish"
            confidence += 5
            
    reasoning = "; ".join(reasons) if reasons else "Valuation multiples are currently in fair range."
    fallback_res = {"signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    # Try LLM
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are an expert Valuation Analyst. Evaluate the price multiples and return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale"}""")
            user_msg = HumanMessage(content=f"Ticker: {state['ticker']}\nTrailing P/E: {pe}, Forward P/E: {fwd_pe}, P/B: {pb}, Dividend Yield: {dividend_yield}%")
            
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except Exception as e:
            logging.error(f"Valuation LLM analysis failed: {e}")
            
    return fallback_res
