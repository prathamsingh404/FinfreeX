# OMG! This is the magical key to open the vault of our Supabase database! Without this, our backend has zero memory!
import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# go look for the secret recipe file .env so we can grab all our passwords
_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase_client: Client | None = None

# if we actually have the keys, let's summon the Supabase client! otherwise, log a warning because we got nothing
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logging.info("Supabase client initialized successfully.")
    except Exception as e:
        logging.error(f"Failed to initialize Supabase client: {e}")
else:
    logging.warning("SUPABASE_URL or SUPABASE_KEY is missing. Supabase client won't be initialized.")

# this is the magic function that lets anyone borrow the database client key when they need to read or write data
def get_supabase() -> Client | None:
    return supabase_client
