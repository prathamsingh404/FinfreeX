# PortAI: Staging step 1
import os
from app.config import get_settings
from langchain_core.language_models import BaseChatModel
import logging

settings = get_settings()

def get_llm(model_type: str = "default") -> BaseChatModel:
    """Returns the configured LLM client wrapper (Groq, OpenAI, Anthropic, or Mock)."""
    # 1. Try Anthropic
    if settings.anthropic_api_key:
        try:
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                model="claude-3-5-haiku-20241022",
                anthropic_api_key=settings.anthropic_api_key,
                temperature=0.3
            )
        except Exception as e:
            logging.error(f"Failed to load Anthropic: {e}")
            
    # 2. Try OpenAI
    if settings.openai_api_key:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model="gpt-4o-mini",
                api_key=settings.openai_api_key,
                temperature=0.3
            )
        except Exception as e:
            logging.error(f"Failed to load OpenAI: {e}")
            
    # 3. Try Groq
    if settings.groq_api_key:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model="llama-3.3-70b-versatile",
                api_key=settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
                temperature=0.3
            )
        except Exception as e:
            logging.error(f"Failed to load Groq: {e}")
            
    # Fallback: Simple Mock LLM wrapper
    class MockChatModel(BaseChatModel):
        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            raise NotImplementedError("No LLM key set. Using rules-based execution.")
            
        def _llm_type(self) -> str:
            return "mock"
            
    return MockChatModel()
