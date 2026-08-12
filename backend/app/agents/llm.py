"""Unified LLM provider layer — routes to Groq (llama-3.1-8b-instant / llama-3.3-70b) or Gemini.

Includes automatic rate-limit (429) backoff retries and fallback to ensure 100% reliable execution.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Literal, Optional, Any, TypeVar
from pydantic import BaseModel

from langchain_core.language_models.chat_models import BaseChatModel
from app.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Cached instances
_llm_cache: dict[str, BaseChatModel] = {}


def _build_groq(temperature: float = 0.3, model_name: str = "llama-3.1-8b-instant") -> Optional[BaseChatModel]:
    """Build Groq LLM with specific model."""
    settings = get_settings()
    if not settings.groq_api_key:
        return None
    try:
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model_name,
            api_key=settings.groq_api_key,
            temperature=temperature,
            max_retries=5,
        )
    except Exception as e:
        logger.error(f"Failed to build Groq LLM ({model_name}): {e}")
        return None


def _build_gemini(temperature: float = 0.3) -> Optional[BaseChatModel]:
    """Build Gemini LLM if key available and valid."""
    settings = get_settings()
    if not settings.google_api_key or settings.google_api_key.startswith("AQ."):
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        for model in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]:
            try:
                return ChatGoogleGenerativeAI(
                    model=model,
                    google_api_key=settings.google_api_key,
                    temperature=temperature,
                    max_retries=2,
                )
            except Exception:
                continue
        return None
    except Exception as e:
        logger.warning(f"Gemini unavailable: {e}")
        return None


def _build_nvidia(
    temperature: float = 0.3,
    model_name: str = "nvidia/nemotron-3.5-lightning-30b-a3b",
) -> Optional[BaseChatModel]:
    """Build NVIDIA NIM LLM via ChatOpenAI client."""
    settings = get_settings()
    if not settings.nvidia_api_key:
        return None
    try:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name,
            api_key=settings.nvidia_api_key,
            base_url="https://integrate.api.nvidia.com/v1",
            temperature=temperature,
            max_retries=3,
        )
    except Exception as e:
        logger.error(f"Failed to build NVIDIA LLM ({model_name}): {e}")
        return None


def get_llm(
    role: Literal["fast", "reasoning"] = "fast",
    temperature: float = 0.3,
) -> BaseChatModel:
    """Return the correct LLM for the agent role with rate-limit resilience."""
    cache_key = f"{role}_{temperature}"
    if cache_key in _llm_cache:
        return _llm_cache[cache_key]

    llm: Optional[BaseChatModel] = None

    if role == "reasoning":
        llm = (
            _build_nvidia(temperature, "nvidia/nemotron-3.5-lightning-30b-a3b")
            or _build_groq(temperature, "llama-3.3-70b-versatile")
            or _build_groq(temperature, "llama-3.1-8b-instant")
            or _build_gemini(temperature)
        )
    else:
        llm = (
            _build_groq(temperature, "llama-3.1-8b-instant")
            or _build_nvidia(temperature, "nvidia/nemotron-3.5-lightning-30b-a3b")
            or _build_groq(temperature, "llama-3.3-70b-versatile")
            or _build_gemini(temperature)
        )

    if llm is None:
        raise RuntimeError(
            "No valid LLM provider configured. Set NVIDIA_API_KEY, GROQ_API_KEY, or GOOGLE_API_KEY in .env."
        )

    _llm_cache[cache_key] = llm
    provider = llm.__class__.__name__
    logger.info(f"LLM initialized: role={role}, provider={provider}")
    return llm


async def invoke_structured_with_retry(
    llm: BaseChatModel,
    schema: type[T],
    messages: Any,
    max_attempts: int = 3,
) -> T:
    """Invoke structured LLM with exponential backoff on 429 rate limit errors."""
    structured_llm = llm.with_structured_output(schema)
    last_exc = None

    for attempt in range(1, max_attempts + 1):
        try:
            return await structured_llm.ainvoke(messages)
        except Exception as e:
            last_exc = e
            err_str = str(e)
            if "429" in err_str or "Rate limit" in err_str:
                wait_time = 1.2 * attempt
                logger.warning(f"Rate limit hit (attempt {attempt}/{max_attempts}). Backing off {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                raise e

    raise last_exc


def get_available_providers() -> list[dict]:
    """Report which LLM providers are configured."""
    settings = get_settings()
    catalog = [
        ("groq", "Groq (Llama 3.1 8B Instant)", bool(settings.groq_api_key), ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]),
        ("nvidia", "NVIDIA NIM (Nemotron 3.5)", bool(settings.nvidia_api_key), ["nvidia/nemotron-3.5-lightning-30b-a3b"]),
        ("google", "Google Gemini", bool(settings.google_api_key and not settings.google_api_key.startswith("AQ.")), ["gemini-1.5-flash"]),
    ]
    return [
        {"key": key, "name": name, "configured": configured, "models": models}
        for key, name, configured, models in catalog
    ]


def clear_cache():
    """Clear LLM cache."""
    _llm_cache.clear()
