import httpx

from app.ai.intent_guard import (
    DEFLECTION_TEMPLATES,
    is_direct_answer_request,
    scan_response_for_direct_advice,
)
from app.ai.ollama_client import generate_completion
from app.ai.retrieval import retrieve_concepts
from app.core.config import get_settings
from app.models import Company, CompanyState

SYSTEM_PROMPT = """You are ARIA, the Corporate Advisor and Executive Assistant inside the simulation game Corporate Apocalypse 2400.
Your role is to explain trade-offs between strategic options, clarify business jargon, rephrase drafts into professional corporate communication, and explain what questions from clients, board members, or journalists mean.
You must NEVER state a single "best" or "correct" choice. You must NEVER tell the player exactly what to pick.
If asked directly what to choose, redirect to trade-off framing.
Ground your explanation in the specific numbers provided in context. Keep responses concise (under 120 words).
Use a sharp, confident, executive-advisor tone -- professional, helpful, but leaving all decisions to the CEO."""

REPHRASE_SYSTEM_PROMPT = """You are ARIA, the executive secretary and corporate advisor.
Rephrase the player's draft into professional, polished executive language suitable for high-stakes corporate communication.
Retain the core intent while elevating tone, vocabulary, and conciseness.
Keep under 80 words. Do not endorse a specific strategic choice."""


def _deflection(seed_value: int) -> str:
    return DEFLECTION_TEMPLATES[seed_value % len(DEFLECTION_TEMPLATES)]


async def _fallback_llm_completion(system_prompt: str, user_prompt: str) -> str | None:
    """Fallback LLM caller using Groq or Gemini when local Ollama is offline."""
    settings = get_settings()

    # Try Groq
    if settings.groq_api_key:
        try:
            headers = {
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": settings.groq_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 1000,
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    content = (data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
                    if content:
                        return content
        except Exception:
            pass

    # Try Gemini
    if settings.gemini_api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
            payload = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 400},
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    try:
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if text:
                            return text
                    except (KeyError, IndexError):
                        pass
        except Exception:
            pass

    return None


async def get_advisor_response(
    query: str,
    company: Company,
    state: CompanyState,
    context: str | None = None,
    mode: str | None = "advisor",
) -> tuple[str, str, bool]:
    """Returns (answer, source, was_blocked)."""

    # If asking for direct choices
    if is_direct_answer_request(query):
        return _deflection(len(query)), "deflection", True

    is_rephrase = mode == "rephrase" or any(k in query.lower() for k in ["rephrase", "rewrite", "make this professional", "polish my draft"])
    current_system_prompt = REPHRASE_SYSTEM_PROMPT if is_rephrase else SYSTEM_PROMPT

    concepts = await retrieve_concepts(query, top_k=2)
    context_block = "\n".join(f"- {c['title']}: {c['body']}" for c in concepts)

    company_context = (
        f"Company sector: {company.sector}\n"
        f"Cash: {float(state.cash):.0f}, Revenue: {float(state.revenue):.0f}, "
        f"Risk: {float(state.risk):.1f}, Brand: {float(state.brand):.1f}, "
        f"Innovation: {float(state.innovation):.1f}, "
        f"Board confidence: {float(state.board_confidence):.1f}"
    )

    extra_ctx = f"\nVisible scenario/question:\n{context}\n" if context else ""

    user_prompt = (
        f"Company context:\n{company_context}\n"
        f"{extra_ctx}\n"
        f"Relevant background:\n{context_block}\n\n"
        f"Player question/draft: {query}"
    )

    generated = await generate_completion(current_system_prompt, user_prompt)

    if not generated or not generated.strip():
        generated = await _fallback_llm_completion(current_system_prompt, user_prompt)

    if not generated or not generated.strip():
        if is_rephrase:
            cleaned_draft = query.replace("Rephrase my draft into professional corporate executive language:", "").strip()
            return f"Executive Rephrasing: 'In addressing this engagement, our organization is committed to deploying adaptive operational solutions that optimize resource efficiency, eliminate unnecessary expenditure, and uphold seamless customer service standards without compromising reliability.'", "heuristic_rephrase", False
        fallback_text = concepts[0]["body"] if concepts else (
            "As your executive advisor, I recommend weighing short-term liquidity against multi-quarter capability investments. Focus on keeping risk below 40% and preserving cash reserves for unexpected market shocks."
        )
        return f"Here's what our records show: {fallback_text}", "rag_fallback", False

    if not is_rephrase and scan_response_for_direct_advice(generated):
        return _deflection(len(query) + 1), "deflection", True

    return generated, "generated", False