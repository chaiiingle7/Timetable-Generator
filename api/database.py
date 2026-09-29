"""Supabase connection. If env vars are missing, the app still works —
it just can't save/load from the database (pure in-memory mode)."""
import os

try:
    from supabase import create_client
except ImportError:  # supabase package not installed yet
    create_client = None


def get_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not create_client or not url or not key:
        return None
    return create_client(url, key)


def load_config():
    client = get_client()
    if not client:
        return None
    res = client.table("app_config").select("data").eq("id", 1).execute()
    rows = res.data or []
    return rows[0]["data"] if rows else None


def save_config(config):
    client = get_client()
    if not client:
        return False
    client.table("app_config").upsert(
        {"id": 1, "data": config}, on_conflict="id").execute()
    return True


def save_timetable(name, config, result):
    client = get_client()
    if not client:
        return None
    res = client.table("saved_timetables").insert(
        {"name": name, "config": config, "result": result}).execute()
    return (res.data or [{}])[0].get("id")


def list_timetables():
    client = get_client()
    if not client:
        return []
    res = (client.table("saved_timetables")
           .select("id, name, created_at")
           .order("created_at", desc=True).limit(20).execute())
    return res.data or []


def get_timetable(row_id):
    client = get_client()
    if not client:
        return None
    res = client.table("saved_timetables").select("*").eq("id", row_id).execute()
    rows = res.data or []
    return rows[0] if rows else None
