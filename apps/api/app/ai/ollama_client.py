import httpx

from app.core.config import get_settings

EMBEDDING_MODEL = "nomic-embed-text"


async def get_embedding(text: str) -> list[float]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.ollama_host}/api/embeddings",
            json={"model": EMBEDDING_MODEL, "prompt": text},
        )
        response.raise_for_status()
        return response.json()["embedding"]