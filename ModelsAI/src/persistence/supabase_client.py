"""
Supabase client singleton.
Uses SUPABASE_SERVICE_ROLE_KEY — only call from backend.
"""

import os
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client

    try:
        from supabase import create_client
    except ImportError:
        raise RuntimeError("supabase not installed. Run: pip install supabase")

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment."
        )

    _client = create_client(url, key)
    return _client
