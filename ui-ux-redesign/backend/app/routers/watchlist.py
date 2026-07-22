from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db.client import get_supabase_client
from app.dependencies import get_current_user

router = APIRouter()

class WatchlistItemRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"

def get_or_create_default_watchlist(user_id: str) -> str:
    db = get_supabase_client()
    res = db.table("watchlists").select("*").eq("user_id", user_id).eq("name", "Default Watchlist").execute()
    if res.data:
        return res.data[0]["id"]
        
    insert_res = db.table("watchlists").insert({
        "user_id": user_id,
        "name": "Default Watchlist"
    }).execute()
    
    if not insert_res.data:
        raise ValueError("Could not create default watchlist")
    return insert_res.data[0]["id"]

@router.get("")
async def get_watchlist(user = Depends(get_current_user)):
    db = get_supabase_client()
    try:
        watchlist_id = get_or_create_default_watchlist(user.id)
        res = db.table("watchlist_items").select("*").eq("watchlist_id", watchlist_id).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/items")
async def add_item(req: WatchlistItemRequest, user = Depends(get_current_user)):
    db = get_supabase_client()
    try:
        watchlist_id = get_or_create_default_watchlist(user.id)
        
        # Check if already exists
        check = db.table("watchlist_items").select("*")\
            .eq("watchlist_id", watchlist_id)\
            .eq("symbol", req.symbol.upper())\
            .execute()
            
        if check.data:
            return check.data[0] # already present
            
        data = {
            "watchlist_id": watchlist_id,
            "symbol": req.symbol.upper().strip(),
            "exchange": req.exchange.upper().strip()
        }
        res = db.table("watchlist_items").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to add item")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/items/{item_id}")
async def remove_item(item_id: str, user = Depends(get_current_user)):
    db = get_supabase_client()
    try:
        watchlist_id = get_or_create_default_watchlist(user.id)
        res = db.table("watchlist_items").delete()\
            .eq("id", item_id)\
            .eq("watchlist_id", watchlist_id)\
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Item not found in watchlist")
        return {"success": True, "removed": item_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
