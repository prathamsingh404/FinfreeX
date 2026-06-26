# PortAI: Staging step 1
from fastapi import APIRouter, HTTPException
from app.services.nse_service import generate_option_chain

router = APIRouter()

@router.get("/chain")
async def option_chain_endpoint(symbol: str, expiry: str = None):
    try:
        res = await generate_option_chain(symbol, expiry)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate options chain: {str(e)}")
