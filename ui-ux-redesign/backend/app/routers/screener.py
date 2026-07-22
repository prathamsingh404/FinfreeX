from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.screener_service import run_screener
from app.db.client import get_supabase_client
from app.dependencies import get_current_user

router = APIRouter()

class ScreenerFilters(BaseModel):
    pe_min: Optional[float] = None
    pe_max: Optional[float] = None
    pb_max: Optional[float] = None
    market_cap_min: Optional[float] = None
    roe_min: Optional[float] = None
    revenue_growth_min: Optional[float] = None
    return_1y_min: Optional[float] = None
    return_1m_min: Optional[float] = None
    volume_ratio_min: Optional[float] = None
    debt_to_equity_max: Optional[float] = None
    sector: Optional[str] = None
    universe: Optional[str] = "ALL"
    sort_by: Optional[str] = "market_cap"
    sort_order: Optional[str] = "desc"
    limit: Optional[int] = 50

class SaveScreenerRequest(BaseModel):
    name: str
    filters: dict

@router.post("/run")
async def run_screener_endpoint(filters: ScreenerFilters):
    try:
        res = await run_screener(filters.dict(), universe=filters.universe)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/saved")
async def get_saved_screeners(user = Depends(get_current_user)):
    db = get_supabase_client()
    res = db.table("saved_screeners").select("*").eq("user_id", user.id).execute()
    return res.data or []

@router.post("/saved")
async def save_screener(req: SaveScreenerRequest, user = Depends(get_current_user)):
    db = get_supabase_client()
    data = {
        "user_id": user.id,
        "name": req.name,
        "filters": req.filters
    }
    res = db.table("saved_screeners").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to save screener")
    return res.data[0]
