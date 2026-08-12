"""Persona agent registry — maps persona keys to their evaluation functions."""
from __future__ import annotations

from typing import Any, Callable, Coroutine, Dict

from app.agents.personas.buffett import evaluate_buffett
from app.agents.personas.graham import evaluate_graham
from app.agents.personas.burry import evaluate_burry
from app.agents.personas.jhunjhunwala import evaluate_jhunjhunwala
from app.agents.personas.ackman import evaluate_ackman
from app.agents.personas.wood import evaluate_wood
from app.agents.personas.munger import evaluate_munger
from app.agents.personas.damodaran import evaluate_damodaran
from app.agents.personas.pabrai import evaluate_pabrai
from app.agents.personas.lynch import evaluate_lynch
from app.agents.personas.fisher import evaluate_fisher
from app.agents.personas.druckenmiller import evaluate_druckenmiller


# Registry: key -> (display_name, style_description, evaluate_function)
PERSONA_REGISTRY: Dict[str, tuple[str, str, Callable[..., Coroutine[Any, Any, dict]]]] = {
    "buffett": ("Warren Buffett", "Quality businesses at a fair price, held long", evaluate_buffett),
    "graham": ("Benjamin Graham", "Deep value with a margin of safety", evaluate_graham),
    "burry": ("Michael Burry", "Contrarian, deeply researched, comfortable being early", evaluate_burry),
    "jhunjhunwala": ("Rakesh Jhunjhunwala", "India-focused, cycle-aware conviction bets", evaluate_jhunjhunwala),
    "ackman": ("Bill Ackman", "Concentrated activist positions", evaluate_ackman),
    "wood": ("Cathie Wood", "Disruptive innovation over long horizons", evaluate_wood),
    "munger": ("Charlie Munger", "Mental models, few decisions, high conviction", evaluate_munger),
    "damodaran": ("Aswath Damodaran", "Discounted cash flow and story-to-number discipline", evaluate_damodaran),
    "pabrai": ("Mohnish Pabrai", "Cloned bets with asymmetric downside", evaluate_pabrai),
    "lynch": ("Peter Lynch", "Growth at a reasonable price, invest in what you know", evaluate_lynch),
    "fisher": ("Philip Fisher", "Scuttlebutt research on management quality", evaluate_fisher),
    "druckenmiller": ("Stanley Druckenmiller", "Macro-led, aggressive sizing, quick to reverse", evaluate_druckenmiller),
}

DEFAULT_PERSONAS = ["buffett", "jhunjhunwala", "graham", "burry"]
