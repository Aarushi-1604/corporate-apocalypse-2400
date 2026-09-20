from app.ai.intent_guard import (
    DEFLECTION_TEMPLATES,
    is_direct_answer_request,
    scan_response_for_direct_advice,
)
from app.ai.ollama_client import generate_completion
from app.ai.retrieval import retrieve_concepts
from app.models import Company, CompanyState

SYSTEM_PROMPT = """You are the Corporate Advisor inside a business simulation game.
Your role is to explain trade-offs between strategic options using the
player's current company data. You must NEVER state a single "best"
or "correct" choice. You must NEVER tell the player exactly what to
pick. If asked directly what to choose, redirect to trade-off framing.
Always ground your explanation in the specific numbers provided in
context. Keep responses under 120 words. Use a confident, executive-
advisor tone -- not academic, not hedgy."""


def _deflection(seed_value: int) -> str:
    return DEFLECTION_TEMPLATES[seed_value % len(DEFLECTION_TEMPLATES)]


async def get_advisor_response(
    query: str, company: Company, state: CompanyState
) -> tuple[str, str, bool]:
    """Returns (answer, source, was_blocked)."""

    if is_direct_answer_request(query):
        return _deflection(len(query)), "deflection", True

    concepts = await retrieve_concepts(query, top_k=2)
    context_block = "\n".join(f"- {c['title']}: {c['body']}" for c in concepts)

    company_context = (
        f"Company sector: {company.sector}\n"
        f"Cash: {float(state.cash):.0f}, Revenue: {float(state.revenue):.0f}, "
        f"Risk: {float(state.risk):.1f}, Brand: {float(state.brand):.1f}, "
        f"Innovation: {float(state.innovation):.1f}, "
        f"Board confidence: {float(state.board_confidence):.1f}"
    )

    user_prompt = (
        f"Company context:\n{company_context}\n\n"
        f"Relevant background:\n{context_block}\n\n"
        f"Player question: {query}"
    )

    generated = await generate_completion(SYSTEM_PROMPT, user_prompt)

    if generated is None:
        fallback_text = concepts[0]["body"] if concepts else (
            "I don't have enough information to help with that right now."
        )
        return f"Here's what our records show: {fallback_text}", "rag_fallback", False

    if scan_response_for_direct_advice(generated):
        return _deflection(len(query) + 1), "deflection", True

    return generated, "generated", False