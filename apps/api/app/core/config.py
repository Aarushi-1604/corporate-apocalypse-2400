from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    '''
    The central configuration for the API

    Note: Pydantic settings reads values in the priority order:
    1. Real env variables set in the shell/OS
    2. Values in the local .env
    3. The defaults written below

    the SAME code works in local dev (.env file) and also in production (real env variables set by the platform)
    You never need to change this file between environments.
    '''
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://postgres.zwslnzogtsvhzuodpncc:SECSymbitech2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
    jwt_secret: str = "f10cd33d85b66f91a9b20db5e5a582754d7cb1e2e8f86d5f92a68fd9854fddf9"
    cors_origin: str = "http://localhost:3000" #default for local dev. In production, the real env variable will override this.
    ollama_host: str = "http://localhost:11434" #default
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-20b"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"
    enable_ollama: bool = False
    event_access_code: str = "SYMBITECH2026"
    model_config = SettingsConfigDict(
        env_file=('.env', 'apps/api/.env', '../apps/api/.env'),
        env_file_encoding = 'utf-8',
        extra='ignore'
    )



@lru_cache #decorator. wrapps the function so python remembers the return value
def get_settings() -> Settings:
    '''
    Returns a single global Settings object
    lru_cache ensures it's loaded only once

    Without caching, every request that depends on Settings would re-read and re-parse the .env file from disk on every single request.
    Highly wasteful. With lru_cache, it reads only once and reuses the same object in memory for all subsequent calls.
    '''
    return Settings() #function wrapped the class Settings so it becomes a dependency that can be injected into any endpoint