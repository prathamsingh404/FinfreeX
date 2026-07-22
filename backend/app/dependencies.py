from fastapi import Header, HTTPException, Depends
from app.db.client import get_supabase_client
from supabase import Client
from app.config import get_settings

settings = get_settings()

def get_db() -> Client:
    return get_supabase_client()

async def get_current_user(authorization: str = Header(None), db: Client = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        if settings.environment == "development":
            class DummyUser:
                id = "00000000-0000-0000-0000-000000000000"
                email = "demo@example.com"
            return DummyUser()
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    token = authorization.split(" ")[1]
    try:
        user_res = db.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid session or token")
        return user_res.user
    except Exception as e:
        if settings.environment == "development":
            class DummyUser:
                id = "00000000-0000-0000-0000-000000000000"
                email = "demo@example.com"
            return DummyUser()
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

