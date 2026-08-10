"""
Last-known-good cache for market data.

The market services used to fabricate quotes, candles and fundamentals with
`random` whenever the upstream feed failed. That is worse than an outage: the
UI cannot tell invented numbers from real ones, and neither can the user.

This replaces that behaviour. A successful fetch is remembered; a failed fetch
serves the remembered value marked `stale`, with the age and the reason. When
nothing has ever been fetched, the caller raises instead of inventing.
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Any, Callable, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Serving something an hour old is defensible during a brief upstream outage.
# Beyond that it stops being "the last price" and starts being history.
DEFAULT_MAX_STALE_SECONDS = 3600

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}


class MarketDataUnavailable(Exception):
    """Raised when live data failed and nothing usable was cached."""

    def __init__(self, subject: str, reason: str) -> None:
        self.subject = subject
        self.reason = reason
        super().__init__(f"No data available for {subject}: {reason}")


def remember(key: str, value: Any) -> None:
    with _lock:
        _store[key] = (time.time(), value)


def recall(key: str, max_age: int = DEFAULT_MAX_STALE_SECONDS) -> Optional[tuple[Any, int]]:
    """Return ``(value, age_seconds)`` if a fresh-enough entry exists."""
    with _lock:
        entry = _store.get(key)
    if entry is None:
        return None
    stored_at, value = entry
    age = int(time.time() - stored_at)
    if age > max_age:
        return None
    return value, age


def clear() -> None:
    with _lock:
        _store.clear()


async def with_cache(
    key: str,
    subject: str,
    fetch: Callable[[], Any],
    *,
    max_age: int = DEFAULT_MAX_STALE_SECONDS,
    annotate: bool = True,
) -> Any:
    """
    Run ``fetch``; on failure fall back to the last good value for ``key``.

    ``fetch`` is an awaitable-returning callable. A dict result is annotated
    with ``stale``/``stale_seconds``/``stale_reason`` so the client can label
    what it is showing. Nothing is ever invented.
    """
    try:
        value = await fetch()
        if value is None or (isinstance(value, (list, dict)) and len(value) == 0):
            raise ValueError("upstream returned no rows")
        if annotate and isinstance(value, dict):
            value = {**value, "stale": False}
        remember(key, value)
        return value
    except Exception as exc:  # noqa: BLE001 - any upstream failure is equivalent here
        cached = recall(key, max_age=max_age)
        if cached is None:
            logger.warning("No live or cached data for %s: %s", subject, exc)
            raise MarketDataUnavailable(subject, str(exc)) from exc

        value, age = cached
        logger.info("Serving cached %s (%ss old) after upstream failure: %s", subject, age, exc)
        if annotate and isinstance(value, dict):
            return {**value, "stale": True, "stale_seconds": age, "stale_reason": str(exc)}
        return value
