# PortAI: Staging step 1
import httpx
from app.db.client import get_supabase_client
from app.config import get_settings
import logging

settings = get_settings()

async def send_telegram_alert(user_id: str, message: str) -> bool:
    """Send a telegram alert to the user. Queries user's telegram settings."""
    db = get_supabase_client()
    res = db.table("notification_settings").select("*").eq("user_id", user_id).execute()
    
    token = None
    chat_id = None
    
    if res.data:
        cfg = res.data[0]
        token = cfg.get("telegram_bot_token")
        chat_id = cfg.get("telegram_chat_id")
        
    # Fallback to system env config
    if not token:
        token = settings.telegram_bot_token
    if not chat_id:
        chat_id = settings.telegram_chat_id
        
    if not token or not chat_id:
        logging.warning(f"Telegram credentials not configured for user {user_id} and no fallback set.")
        return False
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=5.0)
            if res.status_code == 200:
                logging.info(f"Telegram notification sent to chat {chat_id}")
                return True
            else:
                logging.error(f"Failed to send Telegram message: {res.text}")
    except Exception as e:
        logging.error(f"Telegram sending error: {e}")
    return False

async def notify_all_channels(message: str) -> bool:
    """Universal system broadcasting (e.g. for high-risk alerts)."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return False
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json={
                "chat_id": settings.telegram_chat_id,
                "text": f"📢 <b>System Broadcast:</b>\n{message}",
                "parse_mode": "HTML"
            }, timeout=5.0)
            return res.status_code == 200
    except Exception as e:
        print(f"System broadcast failed: {e}")
    return False
