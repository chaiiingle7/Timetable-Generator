# Periodic — Timetabling, solved

A conflict-free weekly timetable generator for colleges.

**Stack:** React (Vite) frontend · Python (FastAPI) scheduling engine ·
Supabase (PostgreSQL) storage · Vercel hosting.

## Run locally
1. Backend:  `python -m venv .venv && source .venv/bin/activate`
   (Windows: `.venv\Scripts\activate`)
   `pip install -r api/requirements.txt`
   `uvicorn api.index:app --reload`
2. Frontend: `npm install` then `npm run dev` → http://localhost:5173

## Endpoints
POST /api/generate · POST /api/substitutes · GET|PUT /api/config ·
GET|POST /api/timetables
