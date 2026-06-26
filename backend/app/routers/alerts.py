from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.services.alert_service import get_active_alerts, create_price_alert, delete_price_alert
from app.dependencies import get_current_user

router = APIRouter()

class CreateAlertRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    condition: Literal["ABOVE", "BELOW"]
    target_value: float

@router.get("")
async def list_alerts(user = Depends(get_current_user)):
    return get_active_alerts(user.id)

@router.post("")
async def create_alert(req: CreateAlertRequest, user = Depends(get_current_user)):
    res = create_price_alert(
        user_id=user.id,
        symbol=req.symbol,
        exchange=req.exchange,
        condition=req.condition,
        target_value=req.target_value
    )
    if not res:
        raise HTTPException(status_code=400, detail="Failed to create alert")
    return res

@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, user = Depends(get_current_user)):
    success = delete_price_alert(user.id, alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already triggered")
    return {"success": True}
