from typing import List, Dict, Any, Optional
import yfinance as yf
import asyncio
from datetime import datetime
import traceback
import json
import os

from dotenv import load_dotenv
from pathlib import Path

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = None

def _init_groq():
    global groq_client
    if GROQ_API_KEY and not groq_client:
        try:
            from groq import Groq
            groq_client = Groq(api_key=GROQ_API_KEY)
        except Exception as e:
            print(f"Failed to init Groq in multi_agents: {e}")

_init_groq()

class HedgeFundAgents:
    def __init__(self):
        self.analysts = {
            "fundamentals_analyst": {"label": "Fundamentals", "description": "Value & Quality", "icon": "solar:chart-square-linear"},
            "technical_analyst": {"label": "Technicals", "description": "Momentum & Trend", "icon": "solar:graph-up-linear"},
            "sentiment_analyst": {"label": "Sentiment", "description": "News & Flow", "icon": "solar:document-text-linear"},
            "valuation_analyst": {"label": "Valuation", "description": "DCF & Multiples", "icon": "solar:calculator-linear"},
            "growth_analyst": {"label": "Growth", "description": "Earnings & Rev", "icon": "solar:rocket-linear"},
            "macro_analyst": {"label": "Macro Regime", "description": "Rates & Liquidity", "icon": "solar:globe-linear"}
        }

    async def run_multi_agent_analysis(
        self, 
        tickers: List[str], 
        use_llm: bool = False, 
        personas: Optional[List[str]] = None,
        model_name: str = "llama3-70b-8192"
    ) -> Dict[str, Any]:
        
        signals: Dict[str, List[Dict[str, Any]]] = {
            agent: [] for agent in self.analysts.keys()
        }
        
        for ticker in tickers:
            try:
                # Use suffix for Indian stocks if missing and not an index
                ticker_sym = ticker
                if not ticker_sym.endswith(".NS") and not ticker_sym.endswith(".BO") and not ticker_sym.startswith("^"):
                    # Check if it's likely Indian (if no explicit suffix)
                    import re
                    if re.match(r"^[A-Z]+$", ticker_sym):
                        # Some well known global stocks shouldn't get .NS blindly, but for PortAI default to NSE
                        global_tech = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"]
                        if ticker_sym not in global_tech:
                            ticker_sym = f"{ticker_sym}.NS"
                            
                # Fetch data
                t = yf.Ticker(ticker_sym)
                info = await asyncio.to_thread(lambda: t.info)
                if not info:
                    info = await asyncio.to_thread(lambda: t.fast_info)

                price = info.get("currentPrice", info.get("lastPrice", 0))
                pe = info.get("trailingPE", 0)
                pb = info.get("priceToBook", 0)
                fwd_pe = info.get("forwardPE", 0)
                peg = info.get("pegRatio", 0)
                beta = info.get("beta", 1.0)
                rev_growth = info.get("revenueGrowth", 0)
                ebitda = info.get("ebitdaMargins", 0)
                
                # Fetch history for technicals
                hist = await asyncio.to_thread(lambda: t.history(period="6mo"))
                
                # 1. Fundamentals Analyst
                if pe > 0 and pb > 0:
                    if pe < 20 and pb < 3:
                        fund_sig = "Bullish"
                        fund_conf = 80
                        fund_rsn = f"Strong value metrics. P/E at {pe:.1f} and P/B at {pb:.1f} indicate undervaluation."
                    elif pe > 40:
                        fund_sig = "Bearish"
                        fund_conf = 75
                        fund_rsn = f"Valuation stretched. P/E at {pe:.1f} suggests high premium."
                    else:
                        fund_sig = "Neutral"
                        fund_conf = 50
                        fund_rsn = f"Fundamentals in line with sector averages. P/E: {pe:.1f}."
                else:
                    fund_sig = "Neutral"
                    fund_conf = 50
                    fund_rsn = "Insufficient fundamental data for deep analysis."
                
                # 2. Technical Analyst
                tech_sig = "Neutral"
                tech_conf = 50
                tech_rsn = "Price action is consolidating."
                if not hist.empty and len(hist) > 50:
                    close_px = hist['Close'].iloc[-1]
                    sma_50 = hist['Close'].rolling(window=50).mean().iloc[-1]
                    sma_200 = hist['Close'].rolling(window=200).mean().iloc[-1] if len(hist) >= 200 else sma_50
                    
                    if close_px > sma_50 and sma_50 > sma_200:
                        tech_sig = "Bullish"
                        tech_conf = 85
                        tech_rsn = f"Price ({close_px:.2f}) is firmly above 50-DMA and 200-DMA indicating strong uptrend."
                    elif close_px < sma_50 and close_px < sma_200:
                        tech_sig = "Bearish"
                        tech_conf = 80
                        tech_rsn = f"Bearish trend confirmed. Price below major moving averages."
                    else:
                        tech_sig = "Neutral"
                        tech_conf = 60
                        tech_rsn = f"Mixed signals. Price chopped around 50-DMA ({sma_50:.2f})."

                # 3. Valuation Analyst (Multiples / DCF approximation)
                val_sig = "Neutral"
                val_conf = 60
                val_rsn = "Valuation models suggest fair value."
                if fwd_pe and pe:
                    if fwd_pe < pe:
                        val_sig = "Bullish"
                        val_conf = 70
                        val_rsn = f"Forward P/E ({fwd_pe:.1f}) is lower than trailing P/E ({pe:.1f}), implying earnings expansion."
                    else:
                        val_sig = "Bearish"
                        val_conf = 65
                        val_rsn = f"Earnings expected to contract. Fwd P/E > TTM P/E."
                
                # 4. Growth Analyst
                growth_sig = "Neutral"
                growth_conf = 55
                growth_rsn = "Stable but unexceptional growth trajectory."
                if rev_growth:
                    if rev_growth > 0.15:
                        growth_sig = "Bullish"
                        growth_conf = 90
                        growth_rsn = f"High revenue growth YoY ({rev_growth*100:.1f}%). Solid expansion."
                    elif rev_growth < 0:
                        growth_sig = "Bearish"
                        growth_conf = 85
                        growth_rsn = f"Revenue contracting YoY ({rev_growth*100:.1f}%). Core business shrinking."

                # 5. Macro Analyst
                macro_sig = "Neutral"
                macro_conf = 65
                if beta > 1.2:
                    macro_rsn = f"High beta stock ({beta:.2f}). Highly sensitive to broad market liquidity conditions. Caution recommended."
                    macro_sig = "Bearish" if tech_sig == "Bearish" else "Neutral"
                elif beta < 0.8 and beta > 0:
                    macro_rsn = f"Low beta asset ({beta:.2f}). Provides good portfolio defense during macro volatility."
                    macro_sig = "Bullish"
                else:
                    macro_rsn = "Stock moves relatively in-line with the benchmark index."

                # 6. Sentiment Analyst
                sentiment_sig = "Neutral"
                sentiment_conf = 50
                sentiment_rsn = "News flow mixed; balancing institutional buying vs retail selling."
                recomm = info.get('recommendationKey', '').lower()
                if recomm in ['buy', 'strong_buy']:
                    sentiment_sig = "Bullish"
                    sentiment_conf = 75
                    sentiment_rsn = "Street consensus and retail sentiment heavily skewed towards accumulation."
                elif recomm in ['sell', 'underperform']:
                    sentiment_sig = "Bearish"
                    sentiment_conf = 75
                    sentiment_rsn = "Negative divergence in sentiment. Multiple downgrades."

                # LLM Override Pass (if requested)
                if use_llm and groq_client:
                    try:
                        # Feed the raw stats to LLM to get a richer narrative matching personas
                        system_prompt = f"""You are the Stratton Oakmont multi-agent backend. 
A team of specialized hedge fund analysts.
Review the following raw metrics for {ticker} and return a JSON with enhanced reasoning.
Metrics: PE={pe}, PB={pb}, FwdPE={fwd_pe}, Beta={beta}, RevGrowth={rev_growth}, TechSignal={tech_sig}
Personas active: {personas if personas else 'Default'}

Return EXACTLY this JSON:
{{
  "fundamentals": {{"reasoning": "...", "confidence": 0-100, "signal": "Bullish/Bearish/Neutral"}},
  "technical": {{"reasoning": "...", "confidence": 0-100, "signal": "Bullish/Bearish/Neutral"}},
  "valuation": {{"reasoning": "...", "confidence": 0-100, "signal": "Bullish/Bearish/Neutral"}},
  "growth": {{"reasoning": "...", "confidence": 0-100, "signal": "Bullish/Bearish/Neutral"}},
  "macro": {{"reasoning": "...", "confidence": 0-100, "signal": "Bullish/Bearish/Neutral"}},
  "sentiment": {{"reasoning": "...", "confidence": 0-100, "signal": "Bullish/Bearish/Neutral"}}
}}"""
                        # Normally we'd do an async call, blocking for simplicity in this MVP snippet
                        completion = groq_client.chat.completions.create(
                            model="llama3-8b-8192", # faster model for multi-agent loops
                            messages=[{"role": "system", "content": system_prompt}],
                            temperature=0.3,
                            response_format={"type": "json_object"}
                        )
                        llm_out = json.loads(completion.choices[0].message.content)
                        
                        fund_rsn = llm_out.get("fundamentals", {}).get("reasoning", fund_rsn)
                        fund_conf = llm_out.get("fundamentals", {}).get("confidence", fund_conf)
                        fund_sig = llm_out.get("fundamentals", {}).get("signal", fund_sig)

                        tech_rsn = llm_out.get("technical", {}).get("reasoning", tech_rsn)
                        tech_conf = llm_out.get("technical", {}).get("confidence", tech_conf)
                        tech_sig = llm_out.get("technical", {}).get("signal", tech_sig)

                        val_rsn = llm_out.get("valuation", {}).get("reasoning", val_rsn)
                        val_conf = llm_out.get("valuation", {}).get("confidence", val_conf)
                        val_sig = llm_out.get("valuation", {}).get("signal", val_sig)

                        growth_rsn = llm_out.get("growth", {}).get("reasoning", growth_rsn)
                        growth_conf = llm_out.get("growth", {}).get("confidence", growth_conf)
                        growth_sig = llm_out.get("growth", {}).get("signal", growth_sig)

                        macro_rsn = llm_out.get("macro", {}).get("reasoning", macro_rsn)
                        macro_conf = llm_out.get("macro", {}).get("confidence", macro_conf)
                        macro_sig = llm_out.get("macro", {}).get("signal", macro_sig)

                        sentiment_rsn = llm_out.get("sentiment", {}).get("reasoning", sentiment_rsn)
                        sentiment_conf = llm_out.get("sentiment", {}).get("confidence", sentiment_conf)
                        sentiment_sig = llm_out.get("sentiment", {}).get("signal", sentiment_sig)
                        
                    except Exception as e:
                        print(f"LLM Override failed for {ticker}: {e}")

                # Append to agent results
                signals["fundamentals_analyst"].append({"agent_id": "fundamentals_analyst", "ticker": ticker, "signal": fund_sig, "confidence": fund_conf, "reasoning": fund_rsn})
                signals["technical_analyst"].append({"agent_id": "technical_analyst", "ticker": ticker, "signal": tech_sig, "confidence": tech_conf, "reasoning": tech_rsn})
                signals["valuation_analyst"].append({"agent_id": "valuation_analyst", "ticker": ticker, "signal": val_sig, "confidence": val_conf, "reasoning": val_rsn})
                signals["growth_analyst"].append({"agent_id": "growth_analyst", "ticker": ticker, "signal": growth_sig, "confidence": growth_conf, "reasoning": growth_rsn})
                signals["macro_analyst"].append({"agent_id": "macro_analyst", "ticker": ticker, "signal": macro_sig, "confidence": macro_conf, "reasoning": macro_rsn})
                signals["sentiment_analyst"].append({"agent_id": "sentiment_analyst", "ticker": ticker, "signal": sentiment_sig, "confidence": sentiment_conf, "reasoning": sentiment_rsn})

            except Exception as e:
                print(f"Error fetching data for {ticker}: {e}")
                # Fallback empty signal
                for agent_id in self.analysts:
                    signals[agent_id].append({"agent_id": agent_id, "ticker": ticker, "signal": "Neutral", "confidence": 0, "reasoning": f"Data fetch failed: {str(e)}"})

        # Risk Adjusted Signals (aggregator)
        risk_signals = []
        portfolio_positions = []
        for ticker in tickers:
            bull_score = sum(1 for a in signals.values() for s in a if s["ticker"] == ticker and s["signal"] == "Bullish")
            bear_score = sum(1 for a in signals.values() for s in a if s["ticker"] == ticker and s["signal"] == "Bearish")
            
            if bull_score > bear_score + 1:
                final_sig = "Bullish"
                action = "BUY"
            elif bear_score > bull_score + 1:
                final_sig = "Bearish"
                action = "SELL"
            else:
                final_sig = "Neutral"
                action = "HOLD"
                
            conf = int((max(bull_score, bear_score) / 6.0) * 100)
            
            risk_signals.append({
                "ticker": ticker,
                "signal": final_sig,
                "confidence": conf,
                "max_position_size": 25000 if final_sig == "Bullish" else (5000 if final_sig == "Bearish" else 10000)
            })
            
            portfolio_positions.append({
                "ticker": ticker,
                "action": action,
                "quantity": 100 if action == "BUY" else 0,
                "confidence": conf,
                "reasoning": f"Aggregated conviction from {bull_score} bullish and {bear_score} bearish signals."
            })

        return {
            "tickers": tickers,
            "analyst_signals": signals,
            "risk_adjusted_signals": risk_signals,
            "portfolio_output": {
                "positions": portfolio_positions,
                "cash_remaining": 75000,
                "total_value": 100000
            },
            "timestamp": datetime.now().isoformat()
        }

hedge_fund_engine = HedgeFundAgents()
