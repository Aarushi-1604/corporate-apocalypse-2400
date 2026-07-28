from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import get_settings

settings = get_settings()
engine = create_async_engine( #manages the connections to Postgress
    settings.database_url,
    echo=(settings.environment=="development"), #when true, it'll print all queries I run in the terminal, eaiser for debugging
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker( #creates new session objects on demand
    engine,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession,None]:
    '''
    Yields a db session for a single request, then always closes it afterword, even if the request raised an error.
    FastAPI endpoints will declare a parameter of the sort `db: AsyncSession = Depends(get_db)`
    and FastAPI will call this generator automatically, injecting the session, and cleaning up after the response is sent. 
    '''
    async with async_session_maker() as session:
        yield session
        # yield instead of return. this makes session a "generator", code before yield runs first. 