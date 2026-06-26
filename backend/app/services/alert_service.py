# PortAI: Staging step 1
from app.db.client import get_supabase_client
from app.services.market_data import get_quote
from app.services.notification_service import send_telegram_alert
import asyncio
from datetime import datetime
import logging

def get_active_alerts(user_id: str = None) -> list[dict]:
    db = get_supabase_client()
    query = db.table("price_alerts").select("*").eq("is_active", True)
    if user_id:
        query = query.eq("user_id", user_id)
    res = query.execute()
    return res.data or []

def create_price_alert(user_id: str, symbol: str, exchange: str, condition: str, target_value: float) -> dict:
    db = get_supabase_client()
    alert = {
        "user_id": user_id,
        "symbol": symbol.upper().strip(),
        "exchange": exchange.upper().strip(),
        "condition": condition,
        "target_value": target_value,
        "is_active": True
    }
    res = db.table("price_alerts").insert(alert).execute()
    return res.data[0] if res.data else {}

def delete_price_alert(user_id: str, alert_id: str) -> bool:
    db = get_supabase_client()
    res = db.table("price_alerts").delete().eq("id", alert_id).eq("user_id", user_id).execute()
    return len(res.data) > 0 if res.data else False

async def check_all_active_alerts():
    """Iterates through all active alerts globally and checks if their thresholds are breached."""
    logging.info("Running background alert threshold checks...")
    db = get_supabase_client()
    alerts = get_active_alerts()
    if not alerts:
        return
        
    for alert in alerts:
        symbol = alert["symbol"]
        exchange = alert["exchange"]
        condition = alert["condition"]
        target = float(alert["target_value"])
        user_id = alert["user_id"]
        
        # Get live price
        quote = await get_quote(symbol, exchange)
        if "error" in quote:
            continue
            
        current = float(quote["current_price"])
        triggered = False
        
        if condition == "ABOVE" and current >= target:
            triggered = True
        elif condition == "BELOW" and current <= target:
            triggered = True
            
        if triggered:
            logging.info(f"Price alert triggered for {symbol}: current {current} is {condition} target {target}")
            
            # 1. Update in DB
            db.table("price_alerts").update({
                "is_active": False,
                "triggered_at": datetime.utcnow().isoformat()
            }).eq("id", alert["id"]).execute()
            
            # 2. Trigger notification
            msg = f"🔔 PortAI Alert: {symbol} on {exchange} has gone {condition} your target of {target}. Current price: {current}."
            await send_telegram_alert(user_id, msg)

async def start_alert_checker():
    """Loops indefinitely in the background to poll alerts."""
    while True:
        try:
            await check_all_active_alerts()
        except Exception as e:
            logging.error(f"Error checking price alerts: {e}")
        await asyncio.sleep(60) # check every minute
