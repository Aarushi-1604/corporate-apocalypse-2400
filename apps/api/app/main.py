from fastapi import Depends, FastAPI
from app.core.config import Settings, get_settings

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
