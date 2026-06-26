# PortAI: Staging step 1
from fastapi import Header, HTTPException, Depends
from app.db.client import get_supabase_client
from supabase import Client

def get_db() -> Client:
    return get_supabase_client()

async def get_current_user(authorization: str = Header(None), db: Client = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        # For development or simple queries, you can return a dummy user or raise 401
        # Let's raise 401 but allow fallback if environment is development and keys aren't fully configured
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    token = authorization.split(" ")[1]
    try:
        user_res = db.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid session or token")
        return user_res.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
