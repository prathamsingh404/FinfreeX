from app.agents.state import AgentState
from app.agents.llm import get_llm
from app.services.sentiment_service import analyze_sentiment
from langchain_core.messages import SystemMessage, HumanMessage
import json
import logging

async def analyze_sentiment_agent(state: AgentState) -> dict:
    """Analyze stock-specific sentiment from current financial news feeds."""
    news = state["news"]
    if not news:
        return {"signal": "Neutral", "confidence": 50, "reasoning": "No current stock news found for sentiment analysis."}
        
    combined_news_text = "\n".join([f"- {item['title']}: {item.get('description', '')}" for item in news[:5]])
    
    # Rules-based classification
    analysis = analyze_sentiment(combined_news_text)
    signal = analysis["sentiment"]
    score = analysis["score"]
    
    confidence = 50 + int(abs(score) * 40)
    reasoning = f"News sentiment score is {score:+.2f}. Classified as {signal} based on keyword density in recent reports."
    fallback_res = {"signal": signal, "confidence": min(confidence, 100), "reasoning": reasoning}
    
    # Try LLM
    llm = get_llm()
    if llm.__class__.__name__ != "MockChatModel":
        try:
            sys_msg = SystemMessage(content="""You are an expert Sentiment Analyst. Analyze recent headlines and return a JSON dictionary.
Your output must be EXACTLY:
{"signal": "Bullish" | "Bearish" | "Neutral", "confidence": 0-100, "reasoning": "detailed 2-sentence rationale"}""")
            user_msg = HumanMessage(content=f"Ticker: {state['ticker']}\nHeadlines text:\n{combined_news_text}")
            
            res = await llm.ainvoke([sys_msg, user_msg])
            data = json.loads(res.content.strip())
            return {
                "signal": data.get("signal", fallback_res["signal"]),
                "confidence": int(data.get("confidence", fallback_res["confidence"])),
                "reasoning": data.get("reasoning", fallback_res["reasoning"])
            }
        except Exception as e:
            logging.error(f"Sentiment LLM analysis failed: {e}")
            
    return fallback_res
