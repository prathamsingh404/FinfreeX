"""OMG! This is the AVENGERS REGISTRY for our AI stock market super-agents! we imported literally all the legendary Wall Street gurus!"""
from __future__ import annotations

from typing import Any, Callable

from src.agents.ackman import ackman_agent
from src.agents.buffett import buffett_agent
from src.agents.burry import burry_agent
from src.agents.damodaran import damodaran_agent
from src.agents.druckenmiller import druckenmiller_agent
from src.agents.fisher import fisher_agent
from src.agents.fundamentals import fundamentals_agent
from src.agents.graham import graham_agent
from src.agents.growth import growth_agent
from src.agents.jhunjhunwala import jhunjhunwala_agent
from src.agents.lynch import lynch_agent
from src.agents.macro_regime import macro_regime_agent
from src.agents.munger import munger_agent
from src.agents.pabrai import pabrai_agent
from src.agents.sentiment import sentiment_agent
from src.agents.technical import technical_agent
from src.agents.valuation import valuation_agent
from src.agents.wood import wood_agent

# The Nerd Squad! These are the hard-working analysts that ALWAYS run and look at boring numbers, charts, and twitter drama
ANALYST_CONFIG: dict[str, tuple[str, Callable[..., dict[str, Any]]]] = {
    "fundamentals": ("fundamentals_analyst", fundamentals_agent),
    "technical": ("technical_analyst", technical_agent),
    "sentiment": ("sentiment_analyst", sentiment_agent),
    "valuation": ("valuation_analyst", valuation_agent),
    "growth": ("growth_analyst", growth_agent),
    "macro_regime": ("macro_regime_analyst", macro_regime_agent),
}

# The Celebrity Squad! These VIPs only join the chat if we invite them with the personas party flag! They use super expensive AI brains to trade like Warren Buffett or Cathie Wood. So extra!
PERSONA_CONFIG: dict[str, tuple[str, Callable[..., dict[str, Any]]]] = {
    "buffett": ("buffett_analyst", buffett_agent),
    "graham": ("graham_analyst", graham_agent),
    "damodaran": ("damodaran_analyst", damodaran_agent),
    "ackman": ("ackman_analyst", ackman_agent),
    "wood": ("wood_analyst", wood_agent),
    "munger": ("munger_analyst", munger_agent),
    "burry": ("burry_analyst", burry_agent),
    "pabrai": ("pabrai_analyst", pabrai_agent),
    "lynch": ("lynch_analyst", lynch_agent),
    "fisher": ("fisher_analyst", fisher_agent),
    "jhunjhunwala": ("jhunjhunwala_analyst", jhunjhunwala_agent),
    "druckenmiller": ("druckenmiller_analyst", druckenmiller_agent),
}
