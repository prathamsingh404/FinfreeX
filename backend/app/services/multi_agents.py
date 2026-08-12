"""DEPRECATED: This module has been replaced by the unified agent pipeline.

The multi-agent analysis is now handled by:
- app.agents.graph (orchestration)
- app.agents.specialist/* (LLM-powered specialist agents)
- app.agents.personas/* (LLM-powered persona agents)
- app.agents.risk_aggregator (risk synthesis)
- app.agents.verdict_synthesizer (final verdict)

This file is kept only for backward compatibility.
Import from app.agents.graph.run_analysis_sync instead.
"""
import warnings

warnings.warn(
    "multi_agents.py is deprecated. Use app.agents.graph instead.",
    DeprecationWarning,
    stacklevel=2,
)


class HedgeFundAgents:
    """Deprecated. Use app.agents.graph.run_analysis_sync."""

    def __init__(self):
        self.analysts = {
            "fundamentals_analyst": {"label": "Fundamentals", "description": "Value & Quality"},
            "technical_analyst": {"label": "Technicals", "description": "Momentum & Trend"},
            "sentiment_analyst": {"label": "Sentiment", "description": "News & Flow"},
            "valuation_analyst": {"label": "Valuation", "description": "DCF & Multiples"},
            "macro_analyst": {"label": "Macro Regime", "description": "Rates & Liquidity"},
            "risk_analyst": {"label": "Risk", "description": "Tail Risk & Leverage"},
        }

    async def run_multi_agent_analysis(self, tickers, **kwargs):
        """Redirects to new unified pipeline."""
        from app.agents.graph import run_analysis_sync

        results = {}
        for ticker in tickers:
            results[ticker] = await run_analysis_sync(ticker)
        return results


hedge_fund_engine = HedgeFundAgents()
