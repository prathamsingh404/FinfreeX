"""Agent state — the shared context passed through the LangGraph workflow.

Every node reads from and writes to this typed dictionary.
The `Annotated[..., operator.ior]` fields merge via dict union
so parallel agents don't overwrite each other's results.
"""
from __future__ import annotations

import operator
from typing import Annotated, Any, Dict, List

from typing_extensions import TypedDict


class AgentState(TypedDict):
    """Shared state carried through the entire analysis pipeline."""

    # ── Input ────────────────────────────────────────────────────────
    ticker: str
    exchange: str

    # ── Market data (fetched once, read by all agents) ───────────────
    market_data: Dict[str, Any]          # fundamentals, quote, company info
    price_history: List[Dict[str, Any]]  # OHLCV bars
    indicators: Dict[str, Any]           # computed technical indicators
    news: List[Dict[str, Any]]           # news articles

    # ── Agent configuration ──────────────────────────────────────────
    active_personas: List[str]           # which persona agents to run

    # ── Agent outputs (merged via dict union) ────────────────────────
    analyst_reports: Annotated[Dict[str, Any], operator.ior]   # specialist outputs
    persona_reports: Annotated[Dict[str, Any], operator.ior]   # persona outputs

    # ── Synthesis outputs ────────────────────────────────────────────
    risk_assessment: Dict[str, Any]      # from risk aggregator
    final_verdict: Dict[str, Any]        # from verdict synthesizer

    # ── Metadata ─────────────────────────────────────────────────────
    metadata: Dict[str, Any]             # model config, timestamps, flags
