import asyncio

import httpx

from app.core.config import get_settings

EMBEDDING_MODEL = "nomic-embed-text"
CHAT_MODEL = "gemma3:4b"
GENERATION_TIMEOUT_SECONDS = 12.0
CONNECT_RETRY_DELAY_SECONDS = 0.5


async def get_embedding(text: str) -> list[float] | None:
    """
    Returns None on any failure -- same fail-silent contract as
    generate_completion. Retrieval depends on Ollama exactly as much
    as generation does (the embedding model runs through the same
    process), so it needs the identical resilience.
    """
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.ollama_host}/api/embeddings",
                json={"model": EMBEDDING_MODEL, "prompt": text},
            )
            response.raise_for_status()
            return response.json()["embedding"]
    except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError):
        return None


async def _attempt_generation(system_prompt: str, user_prompt: str) -> str:
    settings = get_settings()
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


async def generate_completion(system_prompt: str, user_prompt: str) -> str | None:
    """
    Returns None on any unrecoverable failure -- caller falls back to
    RAG-only, never surfaces a raw error to the player.

    Retries exactly once, only on httpx.ConnectError specifically --
    this is the failure shape of "the server process was mid-restart
    for a split second" (what we hit in Phase 21 testing), not a slow
    model. httpx.TimeoutException and httpx.HTTPStatusError are left
    alone deliberately: retrying a genuinely slow or erroring model
    just doubles the wait for no benefit.
    """
    try:
        return await _attempt_generation(system_prompt, user_prompt)
    except httpx.ConnectError:
        await asyncio.sleep(CONNECT_RETRY_DELAY_SECONDS)
        try:
            return await _attempt_generation(system_prompt, user_prompt)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError):
            return None
    except (httpx.TimeoutException, httpx.HTTPStatusError):
        return None