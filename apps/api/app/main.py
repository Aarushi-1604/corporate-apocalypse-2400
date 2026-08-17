from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.registration import router as registration_router
from app.api.v1.companies import router as companies_router
from app.api.v1.operations import router as operations_router
from app.api.v1.events import router as events_router
from app.events.seed import ensure_event_templates_seeded
from app.company_gen.seed import ensure_templates_seeded
from app.core.config import Settings, get_settings
from app.core.db import async_session_maker, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once when the server starts, before it accepts any requests.
    We use it to guarantee company_templates is always seeded --
    every future server start is safe to run, even against a fresh
    database, without a separate manual seeding step.
    """
    async with async_session_maker() as db:
        await ensure_templates_seeded(db)
        await ensure_event_templates_seeded(db)
    yield


app = FastAPI(
    title="Corporate Apocalypse 2400 API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(registration_router, prefix="/api/v1")
app.include_router(companies_router, prefix="/api/v1")
app.include_router(operations_router, prefix="/api/v1")
app.include_router(events_router,prefix="/api/v1")
@app.get("/api/v1/health")
def health_check(settings: Settings = Depends(get_settings)) -> dict:
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/v1/health/db")
async def health_check_db(db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(text("SELECT 1"))
    return {"status": "ok", "database_reachable": result.scalar_one() == 1}