"""FastAPI app — all endpoints live under /api/."""
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Make sibling modules importable when run locally AND on Vercel
sys.path.insert(0, str(Path(__file__).parent.resolve()))

import solver
import substitutes
import database

app = FastAPI(title="Periodic API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Vercel domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConfigBody(BaseModel):
    config: dict


class SubstituteBody(BaseModel):
    config: dict
    schedule: dict
    teacherId: str
    day: str
    period: int


class SaveBody(BaseModel):
    name: str
    config: dict
    result: dict


@app.get("/api/health")
def health():
    return {"ok": True, "database": database.get_client() is not None}


@app.get("/api/config")
def get_config():
    return {"config": database.load_config()}


@app.put("/api/config")
def put_config(body: ConfigBody):
    ok = database.save_config(body.config)
    return {"saved": ok}


@app.post("/api/generate")
def generate(body: ConfigBody):
    return solver.generate_timetable(body.config)


@app.post("/api/substitutes")
def find_subs(body: SubstituteBody):
    return substitutes.find_substitutes(
        body.config, body.schedule, body.teacherId, body.day, body.period)


@app.get("/api/timetables")
def list_saved():
    return {"timetables": database.list_timetables()}


@app.get("/api/timetables/{row_id}")
def get_saved(row_id: str):
    return database.get_timetable(row_id)


@app.post("/api/timetables")
def save_timetable(body: SaveBody):
    new_id = database.save_timetable(body.name, body.config, body.result)
    return {"id": new_id}
