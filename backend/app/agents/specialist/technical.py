# PortAI: Staging step 1
from app.agents.state import AgentState
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json
import logging

async def analyze_technicals(state: AgentState) -> dict:
    """Analyze technical momentum, trends, and key moving averages."""
    indicators = state["indicators"]
    
    # Check if indicators are empty or failed
    if "error" in indicators or not indicators.get("signals"):
        return {"signal": "Neutral", "confidence": 50, "reasoning": "Technical data unavailable for indicators analysis."}
        
    sig_data = indicators["signals"]
    latest = indicators.get("latest", {})
    
    rsi = latest.get("rsi")
    trend = sig_data.get("trend", "NEUTRAL")
    rsi_sig = sig_data.get("rsi_signal", "NEUTRAL")
    macd_sig = sig_data.get("macd_signal", "NEUTRAL")
    
    # Rules-based Technical computation
    confidence = 60
    reasons = []
    
    if trend == "BULLISH":
        reasons.append("EMA crossover indicates an established uptrend (EMA20 > EMA50)")
        signal = "Bullish"
        confidence += 15
    elif trend == "BEARISH":
        reasons.append("EMA structure indicates a downtrend (EMA20 < EMA50)")
        signal = "Bearish"
        confidence += 15
    else:
        signal = "Neutral"
        reasons.append("Price is consolidating within moving averages")
        
    if rsi is not None:
        reasons.append(f"RSI is currently at {rsi:.1f}")
        if rsi < 30:
            reasons.append("RSI is in oversold territory, suggesting a potential rebound")
            signal = "Bullish"
            confidence += 10
        elif rsi > 70:
            reasons.append("RSI is in overbought territory, suggesting potential cooling down")
            signal = "Bearish"
            confidence += 10
            
    if macd_sig == "BULLISH":
        reasons.append("MACD histogram is expanding positively, indicating bullish momentum")
        if signal == "Neutral": signal = "Bullish"
    elif macd_sig == "BEARISH":
        reasons.append("MACD line crossed below signal, confirming bearish momentum")
        if signal == "Neutral": signal = "Bearish"
        
    reasoning = "; ".join(reasons)
    fallback_res = {"signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    # Try LLM
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are an expert Technical Analyst. Review the indicator metrics and return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale"}""")
            user_msg = HumanMessage(content=f"Ticker: {state['ticker']}\nIndicators: {json.dumps(indicators['signals'])}\nLatest values: RSI={rsi}, EMA20={latest.get('ema20')}, EMA50={latest.get('ema50')}, EMA200={latest.get('ema200')}")
            
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except Exception as e:
            logging.error(f"Technicals LLM analysis failed: {e}")
            
    return fallback_res
