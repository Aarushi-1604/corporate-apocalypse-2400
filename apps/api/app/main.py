from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.registration import router as registration_router
from app.api.v1.companies import router as companies_router
from app.api.v1.operations import router as operations_router
from app.api.v1.events import router as events_router
from app.api.v1.employees import router as employees_router
from app.api.v1.clients import router as clients_router
from app.api.v1.market import router as market_router
from app.api.v1.rd import router as rd_router
from app.api.v1.board import router as board_router
from app.api.v1.press import router as press_router
from app.api.v1.reports import router as reports_router
from app.api.v1.ai import router as ai_router
from app.api.v1.leaderboard import router as leaderboard_router 
from app.events.seed import ensure_event_templates_seeded
from app.company_gen.seed import ensure_templates_seeded
from app.employees.seed import ensure_hr_templates_seeded
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
    try:
        async with async_session_maker() as db:
            await ensure_templates_seeded(db)
            await ensure_event_templates_seeded(db)
            await ensure_hr_templates_seeded(db)
    except Exception as e:
        import traceback
        print(f"[Lifespan Warning] Database seeding skipped or failed during startup: {e}")
        traceback.print_exc()
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
app.include_router(employees_router, prefix="/api/v1")
app.include_router(clients_router, prefix="/api/v1")
app.include_router(market_router, prefix="/api/v1")
app.include_router(rd_router, prefix="/api/v1")
app.include_router(press_router, prefix="/api/v1")
app.include_router(board_router,prefix="/api/v1")
app.include_router(reports_router,prefix="/api/v1")
app.include_router(leaderboard_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
@app.get("/api/v1/health")
def health_check(settings: Settings = Depends(get_settings)) -> dict:
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/v1/health/db")
async def health_check_db(db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(text("SELECT 1"))
    return {"status": "ok", "database_reachable": result.scalar_one() == 1}


# Serve statically exported frontend from Next.js (apps/web/out or ./static or ./web_out)
import logging
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger("frontend_server")

# Look in all possible locations where the frontend export might reside
base_dir = Path(__file__).resolve().parent  # app/
api_dir = base_dir.parent                  # apps/api/
root_dir = api_dir.parent                  # repository root /

STATIC_CANDIDATE_PATHS = [
    api_dir / "static",
    root_dir / "static",
    root_dir / "apps" / "web" / "out",
    Path("static").resolve(),
    Path("apps/api/static").resolve(),
    Path("apps/web/out").resolve(),
]

frontend_dir = None
for candidate in STATIC_CANDIDATE_PATHS:
    if candidate.is_dir() and (candidate / "index.html").exists():
        frontend_dir = candidate
        break

if frontend_dir:
    print(f"[Frontend] Serving static frontend from: {frontend_dir}")
    # Mount _next static assets
    next_static_dir = frontend_dir / "_next"
    if next_static_dir.is_dir():
        app.mount("/_next", StaticFiles(directory=str(next_static_dir)), name="next_static")

    # Catch-all router to serve static pages and html files
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        # Don't intercept /api routes or docs
        if full_path.startswith("api/") or full_path == "api" or full_path in ("docs", "redoc", "openapi.json"):
            return {"error": "Not found"}

        requested_file = frontend_dir / full_path

        # Exact file match (e.g. favicon.ico, images)
        if requested_file.is_file():
            return FileResponse(requested_file)

        # Match as an html file (e.g. /login -> login.html, /city -> city.html)
        html_file = frontend_dir / f"{full_path}.html"
        if html_file.is_file():
            return FileResponse(html_file)

        # Match as a directory with index.html (e.g. /hq -> /hq/index.html)
        dir_index = requested_file / "index.html"
        if dir_index.is_file():
            return FileResponse(dir_index)

        # Default fallback to index.html (SPA routing)
        fallback_index = frontend_dir / "index.html"
        if fallback_index.is_file():
            return FileResponse(fallback_index)

        return FileResponse(frontend_dir / "404.html") if (frontend_dir / "404.html").is_file() else {"error": "Not found"}
else:
    print("[Frontend] No built static frontend directory found. Searched:", [str(p) for p in STATIC_CANDIDATE_PATHS])
