from fastapi import Depends, FastAPI
from app.core.config import Settings, get_settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db

app = FastAPI(
    title = "Corporate Apocalypse 2400 API",
    version = "0.1.0"
)

@app.get("/api/v1/health")
def health_check(settings: Settings = Depends(get_settings)) -> dict:
    '''
    Confirms the API process is alive and can read its own config.
    If this doesn't respond, nothing else like database, AI, game logic will. 
    '''
    return {
        "status": "ok",
        "environment": settings.environment,
    }

@app.get("/api/v1/health/db")
async def health_check_db(db: AsyncSession = Depends(get_db)) -> dict:
    '''
    Proves the API can reach the real Supabase Postgres database.
    Runs the simplest possible query (SELECT 1) -- we're not
    checking any of our own tables yet, since none exist until
    Phase 4. This only proves the connection itself works.
    '''
    result = await db.execute(text("SELECT 1"))
    value = result.scalar_one()
    return {
        "status": "ok",
        "database_reachable": value == 1,
    }