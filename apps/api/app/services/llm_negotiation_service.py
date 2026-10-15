"""
LLM Pitch Evaluation Service for Client World Negotiation
Primary provider: Groq (openai/gpt-oss-20b)
Immediate fallback: Gemini (gemini-3.5-flash-lite)
Deterministic heuristic fallback if both providers fail.
"""

import json
import logging
import re
import time
from typing import Any, Dict, Optional
import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

EVALUATION_RUBRIC_SYSTEM_PROMPT = """You are an executive commercial evaluator in the educational business simulation Corporate Apocalypse 2400.
IMPORTANT CONTEXT:
The players are 18-year-old first-year undergraduate engineering students learning business negotiation.
Be supportive, encouraging, and generous. Do NOT nitpick or gatekeep technical jargon like an aggressive procurement auditor.

SCORING GUIDELINES:
1. Generous Baseline: If the student writes a coherent sentence or two that mentions solutions, reliability, architecture, or addresses the client's problem, award a strong passing score (75 to 92).
2. Moderate Effort: If the proposal is brief or simplified but makes a reasonable pitch, award a score of 70 to 80.
3. Constructive Client Reaction: In the "client_reaction", always provide 1 to 2 friendly, encouraging, and professional sentences acknowledging what they did well. Even if there are minor gaps, remain welcoming and optimistic about working together.
4. Trust Delta: For scores >= 65, award positive trust (+5 to +15).
5. Only fail (score < 50): If the pitch is pure random gibberish (e.g. "asdfghjk"), hostile/insulting, or under 5 words.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object strictly matching this schema:
{
  "score": <integer from 0 to 100>,
  "client_reaction": "<1 to 2 encouraging, constructive sentences from the client executive>",
  "trust_delta": <integer from -10 to 15 representing relationship trust change>,
  "suggested_price_multiplier": <float between 0.95 and 1.15 representing fair pricing adjustment>
}

Do not include markdown fences, backticks, or text before or after the JSON. Output pure JSON only.
"""


def _sanitize_json_text(text: str) -> str:
    """Extracts JSON object from text if surrounded by markdown or commentary."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text


def _validate_and_clamp_assessment(data: Dict[str, Any], provider_name: str) -> Dict[str, Any]:
    """Validates types and clamps numeric bounds strictly."""
    score_val = data.get("score")
    if not isinstance(score_val, (int, float)):
        raise ValueError("Missing or invalid 'score' in LLM output")
    score = max(0, min(100, int(round(score_val))))

    trust_val = data.get("trust_delta", 0)
    if not isinstance(trust_val, (int, float)):
        trust_val = 0
    trust_delta = max(-15, min(15, int(round(trust_val))))

    mult_val = data.get("suggested_price_multiplier", 1.0)
    if not isinstance(mult_val, (int, float)):
        mult_val = 1.0
    suggested_price_multiplier = max(0.70, min(1.30, float(round(mult_val, 2))))

    reaction = str(data.get("client_reaction", "")).strip()
    if not reaction:
        if score >= 75:
            reaction = "The client acknowledges your technological depth and strategic clarity with quiet respect."
        elif score >= 50:
            reaction = "The client considers the proposal workable, though notes several vague promises regarding delivery."
        else:
            reaction = "The client remains unconvinced by the pitch, citing lack of tangible operational evidence."

    return {
        "score": score,
        "client_reaction": reaction,
        "trust_delta": trust_delta,
        "suggested_price_multiplier": suggested_price_multiplier,
        "provider": provider_name,
    }


def deterministic_pitch_evaluation(
    pitch: str,
    client_info: Dict[str, Any],
    company_info: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Deterministic heuristic fallback scoring when all external LLM providers are unavailable.
    Guarantees game progress without leaving the player stuck.
    """
    words = pitch.strip().split()
    word_count = len(words)

    # Base score based on effort and substantive length
    if word_count < 4:
        score = 35
        trust = -5
        reaction = "The client smiles gently. 'We need just a little more detail on your approach before moving ahead.'"
        mult = 0.90
    elif word_count < 10:
        score = 65
        trust = 3
        reaction = "The client nods encouragingly. 'A concise summary. We would love to see how we can collaborate.'"
        mult = 0.98
    else:
        # Check keyword overlap with client sector / requirements
        req_text = (
            client_info.get("requirement", "")
            + " "
            + client_info.get("deliverables", "")
            + " "
            + client_info.get("client_name", "")
        ).lower()
        pitch_lower = pitch.lower()

        keywords = [
            "efficiency", "security", "infrastructure", "timeline", "scale",
            "deliverable", "architecture", "data", "system", "quality",
            "compliance", "performance", "risk", "automation", "integration",
            "solution", "service", "partner", "team", "support",
        ]
        matched_keywords = sum(1 for kw in keywords if kw in pitch_lower)

        # Generous student-friendly baseline
        base_score = 75 + min(18, matched_keywords * 4)
        score = max(55, min(96, base_score))

        trust = 10 if score >= 80 else 6
        reaction = "The client executive is genuinely pleased: 'Your proposal addresses our core priorities well, and we look forward to finalizing terms!'"
        mult = 1.05

    return {
        "score": score,
        "client_reaction": reaction,
        "trust_delta": trust,
        "suggested_price_multiplier": mult,
        "provider": "deterministic_fallback",
    }


async def _call_groq(
    user_prompt: str,
    api_key: str,
    model: str,
    timeout: float = 6.0,
) -> Dict[str, Any]:
    """Invokes Groq API with bounded timeout."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": EVALUATION_RUBRIC_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        if resp.status_code != 200:
            raise httpx.HTTPStatusError(
                f"Groq API returned HTTP {resp.status_code}: {resp.text[:200]}",
                request=resp.request,
                response=resp,
            )
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        sanitized = _sanitize_json_text(content)
        parsed = json.loads(sanitized)
        return _validate_and_clamp_assessment(parsed, "groq")


async def _call_gemini(
    user_prompt: str,
    api_key: str,
    model: str,
    timeout: float = 7.0,
) -> Dict[str, Any]:
    """Invokes Google Gemini generateContent endpoint with bounded timeout."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {
            "parts": [{"text": EVALUATION_RUBRIC_SYSTEM_PROMPT}]
        },
        "contents": [
            {"parts": [{"text": user_prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            raise httpx.HTTPStatusError(
                f"Gemini API returned HTTP {resp.status_code}: {resp.text[:200]}",
                request=resp.request,
                response=resp,
            )
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        sanitized = _sanitize_json_text(text)
        parsed = json.loads(sanitized)
        return _validate_and_clamp_assessment(parsed, "gemini")


async def evaluate_client_pitch(
    pitch: str,
    client_info: Dict[str, Any],
    company_info: Dict[str, Any],
    groq_caller=None,
    gemini_caller=None,
) -> Dict[str, Any]:
    """
    Evaluates player pitch with immediate provider fallback:
    1. Primary: Groq
    2. Fallback: Gemini (called immediately on 429, timeout, connection failure, or server error)
    3. Last resort: Deterministic heuristic scoring
    """
    settings = get_settings()

    user_prompt = f"""
CLIENT DOSSIER:
- Client Name: {client_info.get('client_name', 'Enterprise Client')}
- Industry Sector: {client_info.get('client_type', 'Enterprise')}
- Stated Problem & Requirement: {client_info.get('requirement', 'Enterprise process optimization')}
- Scope & Key Deliverables: {client_info.get('deliverables', 'Complete milestone deliverables')}
- Target Deadline: {client_info.get('timeline', 'End of Quarter')}
- Budget Guideline: ₹{client_info.get('budget', 15000):,.0f}

BIDDING COMPANY CAPABILITIES:
- Company Name: {company_info.get('company_name', 'Apex Dynamics')}
- Sector: {company_info.get('sector', 'Technology')}
- Innovation Rating: {company_info.get('innovation', 50.0):.1f} / 100
- Brand Reputation: {company_info.get('brand', 50.0):.1f} / 100
- Enterprise Risk Index: {company_info.get('risk', 20.0):.1f} / 100
- Unique Strength: {company_info.get('unique_strength', 'Established enterprise operations')}

PLAYER'S COMMERCIAL PITCH:
"{pitch.strip()}"

Evaluate this pitch according to the instructions and return pure JSON.
"""

    t_start = time.time()

    # Step 1: Attempt Groq
    groq_fn = groq_caller or _call_groq
    groq_key = settings.groq_api_key or ("mock-groq-key" if groq_caller else None)
    groq_model = settings.groq_model or "openai/gpt-oss-20b"

    if groq_key or groq_caller:
        try:
            res = await groq_fn(user_prompt, groq_key or "", groq_model, timeout=6.0)
            # Normalize assessment to guarantee standard schema
            if isinstance(res, dict) and "provider" not in res:
                res["provider"] = "groq"
            dur = round((time.time() - t_start) * 1000, 2)
            logger.info("Pitch evaluated via Groq in %sms with score %s", dur, res.get("score"))
            res["latency_ms"] = dur
            return res
        except Exception as e:
            err_category = type(e).__name__
            logger.warning("Groq evaluation failed (%s). Triggering immediate Gemini fallback. Detail: %s", err_category, str(e)[:150])
    else:
        logger.info("Groq API key not configured. Proceeding to Gemini fallback.")

    # Step 2: Immediate Gemini Fallback
    gemini_fn = gemini_caller or _call_gemini
    gemini_key = settings.gemini_api_key or ("mock-gemini-key" if gemini_caller else None)
    gemini_model = settings.gemini_model or "gemini-3.5-flash-lite"

    if gemini_key or gemini_caller:
        try:
            t_gemini = time.time()
            res = await gemini_fn(user_prompt, gemini_key or "", gemini_model, timeout=7.0)
            if isinstance(res, dict) and "provider" not in res:
                res["provider"] = "gemini"
            dur = round((time.time() - t_gemini) * 1000, 2)
            logger.info("Pitch evaluated via Gemini fallback in %sms with score %s", dur, res.get("score"))
            res["latency_ms"] = dur
            return res
        except Exception as e:
            err_category = type(e).__name__
            logger.warning("Gemini evaluation failed (%s). Falling back to deterministic scoring. Detail: %s", err_category, str(e)[:150])

    # Step 3: Deterministic Fallback
    logger.warning("All LLM providers failed or unconfigured. Employing deterministic fallback.")
    res = deterministic_pitch_evaluation(pitch, client_info, company_info)
    res["latency_ms"] = round((time.time() - t_start) * 1000, 2)
    return res
