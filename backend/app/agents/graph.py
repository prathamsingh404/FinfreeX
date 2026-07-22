import asyncio
from typing import AsyncGenerator, List
from app.agents.state import AgentState
from app.agents.specialist.fundamentals import analyze_fundamentals
from app.agents.specialist.technical import analyze_technicals
from app.agents.specialist.sentiment import analyze_sentiment_agent
from app.agents.specialist.valuation import analyze_valuation
from app.agents.specialist.macro import analyze_macro
from app.agents.specialist.risk import analyze_risk

from app.agents.personas.buffett import evaluate_buffett
from app.agents.personas.jhunjhunwala import evaluate_jhunjhunwala
from app.agents.personas.graham import evaluate_graham
from app.agents.personas.burry import evaluate_burry

from app.services.market_data import get_quote, get_fundamentals
from app.services.technical_service import compute_indicators
from app.services.news_service import get_aggregated_news

async def run_analysis_stream(
    ticker: str,
    exchange: str = "NSE",
    active_personas: List[str] = None
) -> AsyncGenerator[dict, None]:
    """
    Executes a multi-agent analysis cycle.
    Yields real-time execution steps and completed reports.
    """
    if active_personas is None:
        active_personas = ["buffett", "jhunjhunwala", "graham", "burry"]
        
    yield {"type": "status", "message": f"Establishing socket connection for {ticker} ({exchange})..."}
    await asyncio.sleep(0.5)
    
    yield {"type": "status", "message": "Fetching fundamental metrics & news stream..."}
    # Run fetchers in parallel
    fetch_tasks = [
        get_quote(ticker, exchange),
        get_fundamentals(ticker, exchange),
        compute_indicators(ticker, exchange),
        get_aggregated_news(ticker, 10)
    ]
    quote, fundamentals, indicators, news = await asyncio.gather(*fetch_tasks)
    
    if "error" in quote:
        yield {"type": "error", "message": f"Failed to gather quote data: {quote['error']}"}
        return
        
    # Merge quote and fundamentals
    market_data = {**quote, **fundamentals}
    
    yield {"type": "status", "message": "Structuring data & initializing agents..."}
    await asyncio.sleep(0.5)
    
    state: AgentState = {
        "ticker": ticker,
        "exchange": exchange,
        "underlying_price": quote["current_price"],
        "market_data": market_data,
        "indicators": indicators,
        "news": news,
        "active_personas": active_personas,
        "analyst_reports": {},
        "final_verdict": {}
    }
    
    yield {"type": "market_data", "data": market_data}
    
    # 1. Run specialists
    yield {"type": "status", "message": "Launching specialist analysts (Concurrently)..."}
    await asyncio.sleep(0.3)
    
    spec_tasks = {
        "Fundamentals Specialist": analyze_fundamentals(state),
        "Technical Momentum Specialist": analyze_technicals(state),
        "Sentiment & Flow Specialist": analyze_sentiment_agent(state),
        "Valuation Model Specialist": analyze_valuation(state),
        "Macro Regime Specialist": analyze_macro(state),
        "Risk Specialist": analyze_risk(state)
    }
    
    # Resolve specialist tasks
    for name, task in spec_tasks.items():
        res = await task
        yield {"type": "specialist", "agent": name, "result": res}
        state["analyst_reports"][name] = res
        await asyncio.sleep(0.2) # small delay for visual stream effect
        
    # 2. Run Personas
    yield {"type": "status", "message": "Running investor personas models..."}
    await asyncio.sleep(0.3)
    
    persona_methods = {
        "buffett": ("Warren Buffett", evaluate_buffett(state)),
        "jhunjhunwala": ("Rakesh Jhunjhunwala", evaluate_jhunjhunwala(state)),
        "graham": ("Benjamin Graham", evaluate_graham(state)),
        "burry": ("Michael Burry", evaluate_burry(state))
    }
    
    active_persona_details = []
    for p_id in active_personas:
        if p_id in persona_methods:
            name, task = persona_methods[p_id]
            res = await task
            yield {"type": "persona", "persona": name, "result": res}
            active_persona_details.append(res)
            await asyncio.sleep(0.2)
            
    # 3. Final verdict synthesis
    yield {"type": "status", "message": "Synthesizing institutional verdict..."}
    await asyncio.sleep(0.4)
    
    bull_count = 0
    bear_count = 0
    reasons = []
    
    # Compile scores from personas
    for p in active_persona_details:
        if p["signal"] == "Bullish":
            bull_count += 1
            reasons.append(f"{p['persona']} is Bullish: {p['reasoning']}")
        elif p["signal"] == "Bearish":
            bear_count += 1
            reasons.append(f"{p['persona']} is Bearish: {p['reasoning']}")
            
    # Compile scores from specialists
    for s_name, s_res in state["analyst_reports"].items():
        if s_res["signal"] == "Bullish":
            bull_count += 0.5
        elif s_res["signal"] == "Bearish":
            bear_count += 0.5
            
    total_score = bull_count - bear_count
    if total_score > 1.0:
        verdict = "BUY"
        color = "text-emerald-400"
    elif total_score < -1.0:
        verdict = "SELL"
        color = "text-red-400"
    else:
        verdict = "HOLD"
        color = "text-yellow-400"
        
    summary = f"PortAI final consolidated signal is {verdict}. "
    if verdict == "BUY":
        summary += f"Aggregated analysis shows strong long-term conviction led by bullish indicators from {[p['persona'] for p in active_persona_details if p['signal'] == 'Bullish']}."
    elif verdict == "SELL":
        summary += f"Severe structural or valuation risks detected. Downside warnings highlighted by {[p['persona'] for p in active_persona_details if p['signal'] == 'Bearish']}."
    else:
        summary += "Contrasting signals between growth prospects and high valuations warrant a neutral holding pattern."
        
    final_verdict = {
        "verdict": verdict,
        "score": round(float(total_score), 2),
        "summary": summary,
        "reasons": reasons[:3] # top 3 reasons
    }
    
    yield {"type": "final_verdict", "result": final_verdict}
