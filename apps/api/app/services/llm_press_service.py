"""
LLM Evaluation and Response Pipeline for Press World.
Multi-provider architecture: Groq -> Gemini -> Deterministic heuristic fallback.
Evaluates CEO responses, produces hostile journalist follow-ups, and builds final Corporate Times coverage.
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

PRESS_EVALUATION_SYSTEM_PROMPT = """You are an elite, sharp, cynical investigative journalist in the dystopian cyberpunk simulation Corporate Apocalypse 2400 in New Kalki City.
The player is the corporate CEO undergoing an intense live televised press conference facing hostile reporters.

TASK:
Evaluate the CEO's statement in response to the journalist's question given the crisis context and established facts.
Provide the journalist's next follow-up question OR the final media judgment.

EVALUATION RULES:
1. Grounding: Check if the CEO acknowledges facts, takes accountability, deflects, lies, or stonewalls.
2. Tone: Cynical, hard-hitting, sharp journalistic style fitting New Kalki City's corporate dystopian media.
3. Escalation & Q2 Scrutiny:
   - In Quarter 2+, reporters apply significantly higher scrutiny.
   - Pointedly challenge contradictions between previous Q1 promises, public statements, and subsequent capital allocations or operational decisions.
   - Demand measurable outcomes rather than vague assurances.
   - Subject evasive responses to harsher follow-ups and lower credibility ratings.
   - Still allow credible, transparent, and consistent defenses to achieve a FAVOURABLE outcome.
4. Gender & Identity Rules: ALWAYS refer to the CEO by their official title ("the CEO", "leadership", "executive management") or by their name and appropriate pronouns provided in the dossier. Never default to 'he/him' or make assumptions about gender. If gender is unspecified, use gender-neutral pronouns ('they/them/their') or 'the CEO'.
5. Length: Follow-up question must be 1 to 2 incisive sentences.
6. Final Tone Categories:
   - "FAVOURABLE": CEO took clear accountability, cited tangible remedies, and stood confident.
   - "NEUTRAL": Standard corporate PR speak; neither catastrophic nor reassuring.
   - "SCEPTICAL": Evading details, shifting blame, or hand-waving verified facts.
   - "DAMAGING": Contradicting known facts, aggressive hostility, or incoherent/evasive nonsense.

OUTPUT FORMAT:
Output ONLY valid JSON matching this schema:
For follow-up question (when final=false):
{
  "follow_up_question": "<Incisive 1-2 sentence journalist follow-up pressing on what the CEO evaded or claimed>",
  "tone": "NEUTRAL" | "SCEPTICAL" | "DAMAGING" | "FAVOURABLE",
  "journalist_notes": "<Brief commentary on the CEO's poise>"
}

For final evaluation (when final=true):
{
  "headline": "<Sensational Corporate Times front-page headline in UPPERCASE>",
  "article_body": "<2-3 paragraph biting journalistic article evaluating the CEO's performance at the conference>",
  "tone": "FAVOURABLE" | "NEUTRAL" | "SCEPTICAL" | "DAMAGING",
  "media_verdict": "<1-2 sentence final verdict on executive credibility>",
  "commitments": ["<Any explicit pledge made by the CEO, e.g. 'audit third-party vendors'>"],
  "score": <integer from 0 to 100 where 100 is masterclass crisis defense and 0 is complete PR meltdown>
}

No markdown fences, backticks, or other text outside the JSON.
"""


def sanitize_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text


def deterministic_press_followup(
    crisis_context: Dict[str, Any],
    exchange_index: int,
    statement: str,
) -> Dict[str, Any]:
    """
    Deterministic fallback for journalist follow-ups 1 and 2.
    """
    words = statement.strip().split()
    lower_stmt = statement.lower()

    evasive_keywords = ["no comment", "allegations", "unsubstantiated", "routine", "deny", "misunderstood"]
    accountability_keywords = ["investigate", "responsibility", "audit", "halt", "resolve", "protect", "cooperate", "transparent"]

    is_evasive = any(kw in lower_stmt for kw in evasive_keywords) or len(words) < 5
    takes_responsibility = any(kw in lower_stmt for kw in accountability_keywords)

    if exchange_index == 1:
        if takes_responsibility:
            q = "You speak of accountability, but internal manifests contradict your timeline—how soon will independent investigators be granted unrestricted access to your systems?"
            tone = "NEUTRAL"
        elif is_evasive:
            q = "That sounds like scripted deflection, CEO. The documents are public—are you refusing to acknowledge the civic fallout happening right now outside your headquarters?"
            tone = "SCEPTICAL"
        else:
            q = "An interesting claim, CEO, but market traders are already pricing in catastrophic liability—what specific collateral will you pledge to back up those words?"
            tone = "NEUTRAL"
    else:  # exchange_index == 2
        if takes_responsibility:
            q = "If your commitment is genuine, will you stake your executive bonuses and board seat on resolving this before the current fiscal quarter concludes?"
            tone = "FAVOURABLE"
        elif is_evasive:
            q = "You've dodged direct questions twice now. Shareholders are demanding emergency intervention—are you prepared for a board vote of no confidence?"
            tone = "DAMAGING"
        else:
            q = "Final question, CEO: can you look into the broadcast cameras right now and guarantee that no further hidden liabilities exist within your company?"
            tone = "SCEPTICAL"

    return {
        "follow_up_question": q,
        "tone": tone,
        "journalist_notes": "The press corps remains vigilant, analyzing every nuance of executive inflection.",
        "provider": "deterministic_fallback",
    }


def deterministic_press_final(
    crisis_context: Dict[str, Any],
    statements: List[str],
    company_name: str,
) -> Dict[str, Any]:
    """
    Deterministic fallback for final headline, article, commitments, and consequences.
    """
    full_text = " ".join(statements).lower()
    
    accountability_words = ["audit", "halt", "investigate", "transparent", "compensate", "review", "correct", "protect", "cooperate"]
    evasive_words = ["deny", "false", "unfounded", "routine", "no comment", "rumors", "baseless", "unsubstantiated"]

    acc_score = sum(1 for w in accountability_words if w in full_text)
    eva_score = sum(1 for w in evasive_words if w in full_text)

    # Word brevity check
    word_count = sum(len(s.split()) for s in statements)

    commitments = []
    for s in statements:
        if any(w in s.lower() for w in ["will", "commit", "promise", "guarantee", "initiate"]):
            commitments.append(s.strip())

    min_words = 15 if len(statements) >= 3 else 5
    if acc_score >= 2 and eva_score == 0:
        tone = "FAVOURABLE"
        headline = f"{company_name.upper()} CEO TAKES COMMAND IN FIERCE CRISIS DEFENSE"
        article_body = (
            f"Facing an aggressive press corps under the neon glare of New Kalki's broadcast lights, "
            f"the CEO of {company_name} refused to retreat into scripted denials. Addressing the unfolding crisis head-on, "
            f"executive leadership laid out decisive corrective protocols that caught cynical market observers by surprise.\n\n"
            f"While municipal regulators maintain their statutory inquiry, investor panic subsided noticeably as institutional desks "
            f"applauded the swift demonstration of operational command."
        )
        verdict = "Poised, resolute, and accountable. Public trust steadying."
        score = 85
    elif eva_score > acc_score or word_count < min_words:
        tone = "DAMAGING"
        headline = f"EVASIVE CEO STUMBLES AS {company_name.upper()} EMBROILED IN SCANDAL"
        article_body = (
            f"A disastrous press conference at {company_name} headquarters descended into open hostility this morning as the CEO "
            f"repeatedly deflected verified documentation presented by civic and financial watchdogs.\n\n"
            f"Reporters pressed for accountability on escalating community damages, only to be met with bureaucratic stonewalling and hollow platitudes. "
            f"Inside sources indicate board directors were watching the broadcast with mounting distress."
        )
        verdict = "Hostile and evasive. Severe reputation degradation across New Kalki City."
        score = 30
    elif acc_score >= 1:
        tone = "NEUTRAL"
        headline = f"{company_name.upper()} ADDRESSES INQUIRY UNDER HEAVY SCEPTICISM"
        article_body = (
            f"The CEO of {company_name} delivered a calculated and guarded defense during this morning's high-stakes press conference. "
            f"While acknowledging public concern, executive statements left several technical questions unanswered regarding operational liabilities.\n\n"
            f"Market analysts noted that while the bleeding has been temporarily stemmed, the company remains under strict observation."
        )
        verdict = "Adequate containment, but deep scepticism lingers among market analysts."
        score = 65
    else:
        tone = "SCEPTICAL"
        headline = f"UNANSWERED QUESTIONS DOG {company_name.upper()} AFTER HEATED BRIEFING"
        article_body = (
            f"A tense standoff erupted at the press podium today as journalists repeatedly challenged {company_name}'s official narrative. "
            f"The CEO's succinct remarks did little to calm volatile trading on the New Kalki exchange floor.\n\n"
            f"Civic regulators announced their investigative team will proceed with comprehensive subpoena reviews by week's end."
        )
        verdict = "Ambiguous defense that failed to quell public suspicion."
        score = 50

    return {
        "headline": headline,
        "article_body": article_body,
        "tone": tone,
        "media_verdict": verdict,
        "commitments": commitments or ["No formal binding pledges recorded."],
        "score": score,
        "provider": "deterministic_fallback",
    }


async def evaluate_press_step_llm(
    crisis_context: Dict[str, Any],
    statements: List[str],
    exchange_index: int,
    company_name: str,
    is_final: bool,
) -> Dict[str, Any]:
    """
    Executes Groq -> Gemini -> Deterministic fallback pipeline for press conference exchanges.
    """
    settings = get_settings()

    user_prompt = f"""
CRISIS DOSSIER:
- Quarter: {crisis_context.get('quarter')}
- Company: {company_name}
- CEO Name: {crisis_context.get('ceo_name', 'Executive Leadership')} (Refer to the CEO by their name, title, or gender-neutral pronouns; never use assumed pronouns)
- Headline: {crisis_context.get('headline')}
- Context: {crisis_context.get('context')}
- Established Facts: {crisis_context.get('established_facts')}
- Opening Journalist Question: {crisis_context.get('opening_question')}

CURRENT INTERVIEW RECORD:
"""
    for i, stmt in enumerate(statements):
        user_prompt += f"Exchange #{i+1} CEO Statement: {stmt}\n"

    user_prompt += f"""
TASK SPECIFICATION:
Is this the final conference evaluation? {is_final}
Current Exchange Index: {exchange_index}
Output required JSON strictly matching schema.
"""

    # 1. Try Groq
    if settings.groq_api_key:
        try:
            logger.info("Attempting Press LLM evaluation via Groq (%s)", settings.groq_model)
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.groq_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.groq_model,
                        "messages": [
                            {"role": "system", "content": PRESS_EVALUATION_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.4,
                        "response_format": {"type": "json_object"},
                    },
                )
                if res.status_code == 200:
                    data = res.json()["choices"][0]["message"]["content"]
                    parsed = json.loads(sanitize_json_text(data))
                    parsed["provider"] = "groq"
                    return parsed
                else:
                    logger.warning("Groq Press call failed with status %d: %s", res.status_code, res.text)
        except Exception as e:
            logger.warning("Groq Press evaluation encountered error: %s", str(e))

    # 2. Immediate fallback to Gemini
    if settings.gemini_api_key:
        try:
            logger.info("Falling back to Gemini Press evaluation (%s)", settings.gemini_model)
            async with httpx.AsyncClient(timeout=7.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
                res = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [
                            {
                                "parts": [
                                    {"text": PRESS_EVALUATION_SYSTEM_PROMPT + "\n\n" + user_prompt}
                                ]
                            }
                        ],
                        "generationConfig": {
                            "response_mime_type": "application/json",
                            "temperature": 0.4,
                        },
                    },
                )
                if res.status_code == 200:
                    data = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(sanitize_json_text(data))
                    parsed["provider"] = "gemini"
                    return parsed
                else:
                    logger.warning("Gemini Press call failed with status %d: %s", res.status_code, res.text)
        except Exception as e:
            logger.warning("Gemini Press evaluation encountered error: %s", str(e))

    # 3. Deterministic Heuristic Fallback
    logger.info("Using deterministic Press evaluation fallback.")
    if is_final:
        return deterministic_press_final(crisis_context, statements, company_name)
    else:
        return deterministic_press_followup(crisis_context, exchange_index, statements[-1])
