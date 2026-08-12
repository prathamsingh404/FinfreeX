"""AI analysis and chat router — unified agent pipeline endpoints."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from app.agents.graph import run_analysis_stream
from typing import List, Optional

router = APIRouter()


class AnalysisRequest(BaseModel):
    ticker: str
    exchange: str = "NSE"
    active_personas: Optional[List[str]] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context_symbol: Optional[str] = None


@router.post("/analyze/stream")
async def analyze_stream(request: AnalysisRequest):
    """Streaming AI analysis endpoint.

    Runs the full multi-agent pipeline (6 specialists + risk aggregator +
    personas + verdict synthesizer) and streams each agent's output as SSE events.
    """
    async def event_generator():
        try:
            async for chunk in run_analysis_stream(
                ticker=request.ticker,
                exchange=request.exchange,
                active_personas=request.active_personas,
            ):
                yield f"data: {json.dumps(chunk, default=str)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e), 'done': True})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat")
async def ai_chat(req: ChatRequest):
    """General AI financial Q&A — uses the reasoning LLM for conversational AI."""
    from app.agents.llm import get_llm
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

    try:
        llm = get_llm("reasoning")
    except RuntimeError as e:
        return {"answer": f"AI Chat unavailable: {str(e)}"}

    messages_payload = []

    # System prompt
    ctx_str = f" The user is currently viewing {req.context_symbol}." if req.context_symbol else ""
    messages_payload.append(
        SystemMessage(
            content=(
                "You are PortAI, an expert financial advisor powered by AI. "
                "Guide the user regarding finance, trading, investments, portfolio management, "
                "options strategies, and market analysis. Be concise, precise, and actionable."
                f"{ctx_str}"
            )
        )
    )

    for msg in req.messages:
        if msg.role == "user":
            messages_payload.append(HumanMessage(content=msg.content))
        else:
            messages_payload.append(AIMessage(content=msg.content))

    try:
        res = await llm.ainvoke(messages_payload)
        return {"answer": res.content.strip()}
    except Exception as e:
        return {"answer": f"Error executing chat completion: {str(e)}"}
