# PortAI: Staging step 1
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.db.client import get_supabase_client
from app.services.notification_service import send_telegram_alert
from app.dependencies import get_current_user

router = APIRouter()

class SettingsUpdateRequest(BaseModel):
    telegram_bot_token: str
    telegram_chat_id: str
    digest_frequency: Literal["hourly", "daily", "weekly", "off"] = "daily"
    alert_on_price_trigger: bool = True

@router.get("/settings")
async def get_settings(user = Depends(get_current_user)):
    db = get_supabase_client()
    res = db.table("notification_settings").select("*").eq("user_id", user.id).execute()
    if res.data:
        return res.data[0]
        
    default_settings = {
        "user_id": user.id,
        "telegram_bot_token": "",
        "telegram_chat_id": "",
        "digest_frequency": "daily",
        "alert_on_price_trigger": True
    }
    db.table("notification_settings").insert(default_settings).execute()
    return default_settings

@router.put("/settings")
async def update_settings(req: SettingsUpdateRequest, user = Depends(get_current_user)):
    db = get_supabase_client()
    data = req.dict()
    res = db.table("notification_settings").upsert({
        "user_id": user.id,
        **data
    }).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to update notification settings")
    return res.data[0]

@router.post("/test")
async def test_telegram_settings(user = Depends(get_current_user)):
    success = await send_telegram_alert(
        user_id=user.id,
        message="🎉 <b>PortAI Connection Test</b>\nYour Telegram integration is online and active!"
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to deliver test message. Verify bot token and chat ID.")
    return {"success": True}
