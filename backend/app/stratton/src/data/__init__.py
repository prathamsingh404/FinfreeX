"""
Data access for the engine.

The Polygon client is imported lazily. It depends on `polygon-api-client`,
which is optional: the default provider is yfinance, and a deployment that
never sets POLYGON_API_KEY should not be forced to install an SDK it will not
call. Importing it eagerly here made every agent import fail with
`ModuleNotFoundError: No module named 'polygon'`.
"""
from typing import Any

from src.data.models import AnalystSignal, CompanyDetails, CompanyNews, FinancialMetrics, Portfolio, Position, Price

_POLYGON_EXPORTS = {"get_company_details", "get_company_news", "get_financial_metrics", "get_prices"}


def __getattr__(name: str) -> Any:
    """Resolve the Polygon helpers only when something actually asks for one."""
    if name in _POLYGON_EXPORTS:
        from src.data import polygon_client

        return getattr(polygon_client, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "AnalystSignal",
    "CompanyDetails",
    "CompanyNews",
    "FinancialMetrics",
    "Portfolio",
    "Position",
    "Price",
    "get_company_details",
    "get_company_news",
    "get_financial_metrics",
    "get_prices",
]
