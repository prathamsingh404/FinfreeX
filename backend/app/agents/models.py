"""Pydantic output schemas for all agents with resilient type coercions and field validation.

Every agent returns structured output conforming to these models.
Flexible validators ensure robustness against string numbers or uppercase signals.
"""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator


def _clean_signal(v: Any) -> str:
    """Coerce signals to titlecase (Bullish, Bearish, Neutral)."""
    if isinstance(v, str):
        val = v.strip().title()
        if val in ["Bullish", "Bearish", "Neutral"]:
            return val
        if "Bull" in val:
            return "Bullish"
        if "Bear" in val:
            return "Bearish"
    return "Neutral"


def _clean_int(v: Any) -> int:
    """Coerce string numbers to integer 0-100."""
    if isinstance(v, (int, float)):
        return max(0, min(100, int(v)))
    if isinstance(v, str):
        import re
        digits = re.findall(r"\d+", v)
        if digits:
            return max(0, min(100, int(digits[0])))
    return 50


class AgentReport(BaseModel):
    """Standard output from any specialist analyst agent."""
    agent_id: str = Field(default="specialist_agent", description="Identifier of the agent that produced this report")
    signal: str = Field(
        default="Neutral",
        description="The directional signal: Bullish, Bearish, or Neutral"
    )
    confidence: int = Field(
        default=50, ge=0, le=100,
        description="Confidence level 0-100 in the signal"
    )
    reasoning: str = Field(
        default="",
        description="Detailed 2-3 sentence rationale for the signal"
    )
    key_factors: list[str] = Field(
        default_factory=list,
        description="Top 3-5 factors driving this signal"
    )
    data_points: dict[str, Any] = Field(
        default_factory=dict,
        description="Key numeric data points used in analysis"
    )

    @field_validator("signal", mode="before")
    def validate_signal(cls, v: Any) -> str:
        return _clean_signal(v)

    @field_validator("confidence", mode="before")
    def validate_confidence(cls, v: Any) -> int:
        return _clean_int(v)


class PersonaReport(BaseModel):
    """Output from an investor persona agent."""
    persona_name: str = Field(default="Investor Persona", description="Name of the investor persona")
    agent_id: str = Field(default="persona_agent", description="Identifier of the persona agent")
    signal: str = Field(
        default="Neutral",
        description="The directional signal from this persona's perspective"
    )
    confidence: int = Field(
        default=50, ge=0, le=100,
        description="Conviction level 0-100"
    )
    investment_thesis: str = Field(
        default="",
        description="The persona's investment thesis in their voice/style, 3-4 sentences"
    )
    reasoning: str = Field(
        default="",
        description="Detailed reasoning in the persona's characteristic analytical style"
    )
    risk_warnings: list[str] = Field(
        default_factory=list,
        description="Key risks this persona would flag"
    )
    key_factors: list[str] = Field(
        default_factory=list,
        description="Factors most important to this persona's philosophy"
    )

    @field_validator("signal", mode="before")
    def validate_signal(cls, v: Any) -> str:
        return _clean_signal(v)

    @field_validator("confidence", mode="before")
    def validate_confidence(cls, v: Any) -> int:
        return _clean_int(v)


class RiskAssessment(BaseModel):
    """Output from the risk aggregator."""
    consensus_signal: str = Field(
        default="Neutral",
        description="Risk-adjusted consensus from all specialists"
    )
    consensus_confidence: int = Field(
        default=50, ge=0, le=100,
        description="Confidence in the consensus after risk adjustment"
    )
    signal_agreement: float = Field(
        default=0.5, ge=0, le=1,
        description="Fraction of specialists that agree (0-1)"
    )
    key_risks: list[str] = Field(
        default_factory=list,
        description="Top risks identified across all specialist reports"
    )
    risk_reward_ratio: str = Field(
        default="Moderate",
        description="Qualitative risk/reward assessment"
    )
    position_sizing_guidance: str = Field(
        default="moderate",
        description="Suggested position size based on risk: conservative/moderate/aggressive"
    )
    dissenting_views: list[str] = Field(
        default_factory=list,
        description="Notable contrarian signals from specialists"
    )

    @field_validator("consensus_signal", mode="before")
    def validate_signal(cls, v: Any) -> str:
        return _clean_signal(v)

    @field_validator("consensus_confidence", mode="before")
    def validate_confidence(cls, v: Any) -> int:
        return _clean_int(v)


class FinalVerdict(BaseModel):
    """Output from the verdict synthesizer — the institutional-grade final call."""
    verdict: str = Field(
        default="HOLD",
        description="Final action recommendation: STRONG BUY, BUY, HOLD, SELL, STRONG SELL"
    )
    conviction_score: float = Field(
        default=0.0, ge=-100, le=100,
        description="Conviction score: -100 (max bearish) to +100 (max bullish)"
    )
    summary: str = Field(
        default="",
        description="Executive summary of the entire analysis, 3-4 sentences"
    )
    bull_case: str = Field(
        default="",
        description="The strongest bull case in 2-3 sentences"
    )
    bear_case: str = Field(
        default="",
        description="The strongest bear case in 2-3 sentences"
    )
    key_risks: list[str] = Field(
        default_factory=list,
        description="Top 3 risks to monitor"
    )
    key_catalysts: list[str] = Field(
        default_factory=list,
        description="Potential catalysts that could move the stock"
    )
    position_suggestion: str = Field(
        default="",
        description="Concrete position suggestion with reasoning"
    )
    time_horizon: str = Field(
        default="Medium-term (3-6 months)",
        description="Recommended investment time horizon"
    )

    @field_validator("verdict", mode="before")
    def validate_verdict(cls, v: Any) -> str:
        if isinstance(v, str):
            val = v.strip().upper()
            if val in ["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"]:
                return val
            if "STRONG" in val and "BUY" in val:
                return "STRONG BUY"
            if "STRONG" in val and "SELL" in val:
                return "STRONG SELL"
            if "BUY" in val:
                return "BUY"
            if "SELL" in val:
                return "SELL"
        return "HOLD"
