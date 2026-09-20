import httpx

from app.core.config import get_settings

EMBEDDING_MODEL = "nomic-embed-text"
CHAT_MODEL = "gemma3:4b"
GENERATION_TIMEOUT_SECONDS = 12.0

async def get_embedding(text: str) -> list[float]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.ollama_host}/api/embeddings",
            json={"model": EMBEDDING_MODEL, "prompt": text},
        )
        response.raise_for_status()
        return response.json()["embedding"]

async def generate_completion(system_prompt: str, user_prompt: str) -> str | None:
    """
    Returns None on any failure (timeout, connection refused, bad
    response) -- caller is responsible for falling back to RAG-only,
    never for surfacing a raw error to the player. This is the one
    function in the whole AI pipeline allowed to fail silently,
    because failing silently here is exactly what keeps the feature
    itself always working.
    """
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=GENERATION_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{settings.ollama_host}/api/generate",
                json={
                    "model": CHAT_MODEL,
                    "system": system_prompt,
                    "prompt": user_prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            return response.json()["response"].strip()
    except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError):
        return None