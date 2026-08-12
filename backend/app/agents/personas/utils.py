"""Shared utilities for persona agents."""
from __future__ import annotations

import json
from typing import Any, Dict


def format_investment_brief(state: Dict[str, Any]) -> str:
    """Format state data into a concise investment brief for persona evaluation."""
    market_data = state.get("market_data", {})
    indicators = state.get("indicators", {})
    news = state.get("news", [])
    analyst_reports = state.get("analyst_reports", {})

    # Core metrics
    metrics = {
        "Company": market_data.get("company_name", state.get("ticker", "Unknown")),
        "Ticker": state.get("ticker"),
        "Sector": market_data.get("sector", "Unknown"),
        "Current Price": market_data.get("current_price"),
        "Market Cap": market_data.get("market_cap"),
        "P/E Ratio": market_data.get("pe_ratio"),
        "Forward P/E": market_data.get("forward_pe"),
        "P/B Ratio": market_data.get("pb_ratio"),
        "ROE": market_data.get("roe"),
        "Debt/Equity": market_data.get("debt_to_equity"),
        "Revenue Growth": market_data.get("revenue_growth"),
        "Profit Margins": market_data.get("profit_margins"),
        "Free Cash Flow": market_data.get("free_cashflow"),
        "Dividend Yield": market_data.get("dividend_yield"),
        "Beta": market_data.get("beta"),
        "52-Week High": market_data.get("fifty_two_week_high"),
        "52-Week Low": market_data.get("fifty_two_week_low"),
    }

    available = {k: v for k, v in metrics.items() if v is not None}

    # Technical summary
    tech_summary = ""
    if indicators and "signals" in indicators:
        sigs = indicators["signals"]
        tech_summary = f"\nTechnical: Trend={sigs.get('trend', 'N/A')}, RSI Signal={sigs.get('rsi_signal', 'N/A')}, MACD={sigs.get('macd_signal', 'N/A')}"

    # News summary
    news_summary = ""
    if news:
        headlines = [item.get("title", "") if isinstance(item, dict) else str(item) for item in news[:5]]
        news_summary = "\nRecent Headlines:\n" + "\n".join(f"- {h}" for h in headlines if h)

    # Specialist consensus
    specialist_summary = ""
    if analyst_reports:
        specialist_lines = []
        for agent_id, report in analyst_reports.items():
            if isinstance(report, dict):
                sig = report.get("signal", "N/A")
                conf = report.get("confidence", "N/A")
                specialist_lines.append(f"- {agent_id}: {sig} ({conf}% confidence)")
        if specialist_lines:
            specialist_summary = "\nSpecialist Analyst Signals:\n" + "\n".join(specialist_lines)

    brief = f"""Investment Brief:
{json.dumps(available, indent=2, default=str)}
{tech_summary}
{news_summary}
{specialist_summary}"""

    return brief
