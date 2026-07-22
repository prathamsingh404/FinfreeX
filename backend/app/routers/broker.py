from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel
from typing import Optional
from app.services.broker_service import generate_upstox_login_url, exchange_upstox_code, fetch_upstox_holdings

router = APIRouter()

class TokenExchangeRequest(BaseModel):
    code: str

@router.get("/login-url")
def get_login_url():
    url = generate_upstox_login_url()
    return {"login_url": url}

@router.post("/callback/upstox")
async def upstox_callback(req: TokenExchangeRequest):
    token = await exchange_upstox_code(req.code)
    if not token:
         raise HTTPException(status_code=400, detail="Failed to exchange authorization code for token.")
    return {"access_token": token}

@router.get("/holdings")
async def get_holdings(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
         raise HTTPException(status_code=401, detail="Broker access token required")
    
    token = authorization.split(" ")[1]
    holdings = await fetch_upstox_holdings(token)
    return holdings
