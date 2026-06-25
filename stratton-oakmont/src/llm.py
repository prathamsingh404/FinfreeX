"""omg this file is literally a factory that constructs super-smart robot brains to chat with us"""
from __future__ import annotations

import logging
from typing import TypeVar

from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import BaseModel

from src.config.settings import (
    ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY,
    GOOGLE_API_KEY,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    validate_llm_key,
)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def get_chat_model(
    model_name: str = "gpt-4o-mini",
    model_provider: str = "openai",
    temperature: float = 0.0,
) -> BaseChatModel:
    """this builds a real robot brain based on what provider you choose like openai google or groq! it's like choosing a companion in a video game!"""
    validate_llm_key(model_provider)

    if model_provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_name, api_key=OPENAI_API_KEY, temperature=temperature)
    elif model_provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model_name, api_key=ANTHROPIC_API_KEY, temperature=temperature)
    elif model_provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(model=model_name, api_key=GROQ_API_KEY, temperature=temperature)
    elif model_provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_name, google_api_key=GOOGLE_API_KEY, temperature=temperature,
        )
    elif model_provider == "deepseek":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name, api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com", temperature=temperature,
        )
    elif model_provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(model=model_name, temperature=temperature)
    else:
        raise ValueError(
            f"Unknown LLM provider: '{model_provider}'. "
            f"Supported: openai, anthropic, groq, google, deepseek, ollama"
        )


def call_llm(
    prompt: str,
    response_model: type[T],
    model_name: str = "gpt-4o-mini",
    model_provider: str = "openai",
    max_retries: int = 3,
    default_factory: callable | None = None,
) -> T:
    """bruh this talks to the smart robot brain and forces it to give clean formatted pydantic output! if the robot brain gets confused and does a faceplant it retries up to max_retries times! and if it still fails it either gives you some backup junk from the default_factory or throws a giant screaming error!"""
    llm = get_chat_model(model_name, model_provider)
    structured_llm = llm.with_structured_output(response_model)

    last_exception: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            result = structured_llm.invoke(prompt)
            logger.debug(f"LLM call succeeded on attempt {attempt}")
            return result
        except Exception as e:
            last_exception = e
            logger.warning(f"LLM call attempt {attempt}/{max_retries} failed: {e}")

    logger.error(f"LLM call failed after {max_retries} attempts")
    if default_factory is not None:
        return default_factory()

    raise last_exception  # type: ignore[misc]
