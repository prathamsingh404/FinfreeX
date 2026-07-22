from supabase import create_client, Client
from app.config import get_settings
import logging

settings = get_settings()
_supabase_client: Client | None = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if settings.supabase_url and settings.supabase_service_key:
            try:
                _supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
                logging.info("Supabase client initialized successfully with Service Key.")
            except Exception as e:
                logging.error(f"Failed to initialize Supabase client: {e}")
                raise e
        else:
            logging.error("Supabase URL or Service Key is missing from settings.")
            raise ValueError("Supabase configuration missing.")
    return _supabase_client
