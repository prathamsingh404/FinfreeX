from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from app.agents.graph import run_analysis_stream
from app.dependencies import get_current_user
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
async def analyze_stream(
    request: AnalysisRequest,
):
    """
    Streaming AI analysis endpoint.
    Returns Server-Sent Events (SSE) with agent outputs as they complete.
    """
    async def event_generator():
        try:
            async for chunk in run_analysis_stream(
                ticker=request.ticker,
                exchange=request.exchange,
                active_personas=request.active_personas
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.post("/chat")
async def ai_chat(
    req: ChatRequest,
):
    """General AI financial Q&A — queries the LLM with user context."""
    from app.agents.llm import get_llm
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    
    llm = get_llm()
    if llm.__class__.__name__ == "MockChatModel":
        return {"answer": "AI Chat is currently offline because no LLM keys (Anthropic, OpenAI, or Groq) are configured in the server environment variables."}
        
    messages_payload = []
    
    # Inject context system prompt
    ctx_str = f" Context ticker active: {req.context_symbol}." if req.context_symbol else ""
    messages_payload.append(SystemMessage(content=f"You are PortAI, a helpful financial advisor. Guide the user regarding finance, trading, investments, or options.{ctx_str} Keep your responses concise and precise."))
    
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
