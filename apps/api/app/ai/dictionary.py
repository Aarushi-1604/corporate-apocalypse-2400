from app.ai.intent_guard import (
    DICTIONARY_DEFLECTION_TEMPLATES,
    is_competitive_framing,
    is_direct_answer_request,
)
from app.ai.ollama_client import generate_completion
from app.ai.retrieval import retrieve_concepts

SYSTEM_PROMPT = """You are the Corporate Dictionary, a neutral business-concept
reference inside a simulation game. You explain concepts in Finance,
Economics, Marketing, ESG, Corporate Governance, Business, and
Technology. You do NOT have access to any player's company data and
must not speculate about it. If asked a competitive or strategic
question, politely decline and instead offer to explain the
underlying concepts involved. Keep explanations under 100 words,
clear and jargon-light."""


def _deflection(seed_value: int) -> str:
    return DICTIONARY_DEFLECTION_TEMPLATES[seed_value % len(DICTIONARY_DEFLECTION_TEMPLATES)]


async def get_dictionary_response(query: str) -> tuple[str, str, bool]:
    """Returns (answer, source, was_blocked). Never receives or uses
    any company/session data -- this function's signature itself
    enforces that constraint, not just the prompt."""

    if is_direct_answer_request(query) or is_competitive_framing(query):
        return _deflection(len(query)), "deflection", True

    concepts = await retrieve_concepts(query, top_k=1)

    if not concepts:
        return "I don't have a concept for that yet -- try rephrasing.", "not_found", False

    top_concept = concepts[0]
    user_prompt = f"Concept: {top_concept['title']}\nDefinition: {top_concept['body']}\n\nQuestion: {query}"

    generated = await generate_completion(SYSTEM_PROMPT, user_prompt)

    if generated is None:
        return top_concept["body"], "rag_fallback", False

    if is_direct_answer_request(generated) or is_competitive_framing(generated):
        return _deflection(len(query) + 1), "deflection", True

    return generated, "generated", False