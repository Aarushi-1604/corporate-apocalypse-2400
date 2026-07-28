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
    database_url: str #if DATABASE_URL is missing in .env, app won't start. 
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding = 'utf-8'
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