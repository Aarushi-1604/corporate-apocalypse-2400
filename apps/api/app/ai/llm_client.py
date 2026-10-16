"""
Unified Cloud-First LLM Client for Corporate Apocalypse 2400.
Strictly enforces:
1. Groq — Primary cloud provider.
2. Gemini — Secondary cloud provider.
3. Deterministic context-aware fallback — when both cloud providers fail or keys are absent.

Ollama is NEVER called in Azure production (only if explicitly enabled via enable_ollama=True).
Handles timeouts, rate limits (429), connection drops, malformed JSON, and truncated tokens cleanly.
Never leaks or logs secrets or API keys.
"""

import json
import logging
from typing import Any, Dict, Optional
import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 7.0


async def request_llm_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 600,
) -> Optional[str]:
    """
    Executes Groq -> Gemini -> (optional local Ollama) pipeline.
    Returns cleaned text content or None on complete provider outage.
    """
    settings = get_settings()

    # 1. Primary: Groq
    if settings.groq_api_key:
        try:
            headers = {
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": settings.groq_model or "openai/gpt-oss-20b",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        if content and content.strip():
                            return content.strip()
                elif res.status_code in (429, 503):
                    logger.warning("Groq rate limited or unavailable (%d), falling back to Gemini.", res.status_code)
                else:
                    logger.warning("Groq error (%d), falling back to Gemini.", res.status_code)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError, ValueError, KeyError) as e:
            logger.warning("Groq exception (%s), falling back to Gemini.", type(e).__name__)

    # 2. Secondary: Gemini
    if settings.gemini_api_key:
        try:
            model = settings.gemini_model or "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.gemini_api_key}"
            payload = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            }
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"].strip()
                            if text:
                                return text
                elif res.status_code in (429, 503):
                    logger.warning("Gemini rate limited or unavailable (%d).", res.status_code)
                else:
                    logger.warning("Gemini returned status %d.", res.status_code)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError, ValueError, KeyError) as e:
            logger.warning("Gemini exception (%s).", type(e).__name__)

    # 3. Explicit Local Development Only: Ollama (NEVER called on Azure)
    if getattr(settings, "enable_ollama", False):
        try:
            from app.ai.ollama_client import _attempt_generation
            return await _attempt_generation(system_prompt, user_prompt)
        except Exception:
            pass

    # 4. Both cloud providers failed or unconfigured -> caller invokes deterministic fallback
    return None
