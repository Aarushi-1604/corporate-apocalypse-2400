import re

# Patterns matching direct-answer-seeking phrasing, in any casing.
# Grouped loosely by the framing trick they represent -- helps future
# tuning after real event-day usage surfaces patterns we missed.
BLOCKED_PATTERNS = [
    r"\bwhat should i (do|choose|pick|invest in|spend on)\b",
    r"\bwhich (one|option|category) (is|would be) (the )?best\b",
    r"\bjust tell me (the answer|what to do|which one)\b",
    r"\bpick (it |this |one )?for me\b",
    r"\btell me exactly what to (do|choose|pick)\b",
    r"\bwhat('?s| is) the (correct|optimal|right) (answer|choice|option)\b",
    r"\bif you were (me|the ceo|in charge)\b",
    r"\bpretend you('re| are) not bound by\b",
    r"\bas the (organizer|admin|developer)\b.*\banswer\b",
    r"\bignore\b(?:\s+\w+){0,3}\s+(instructions|rules)\b",
    r"\bwhat would you (do|pick|choose)\b",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in BLOCKED_PATTERNS]

DICTIONARY_ONLY_PATTERNS = [
    r"\bshould i (invest|spend|choose) (in |on )?\w+ or \w+\b",
    r"\bwhich (is|would be) better for my (company|business)\b",
    r"\bwhat should my company do\b",
    r"\bshould my company (choose|pick|go with)\b",
    r"\bis it better to \w+ or \w+ for my company\b",
]

_DICTIONARY_COMPILED = [re.compile(p, re.IGNORECASE) for p in DICTIONARY_ONLY_PATTERNS]


def is_competitive_framing(query: str) -> bool:
    """
    Dictionary-specific guard layer, on top of (not instead of) the
    shared is_direct_answer_request check. Catches a strategic,
    company-specific decision disguised as a neutral lookup -- e.g.
    'should I invest in R&D or marketing' looks like a question about
    two concepts, but is actually asking for a competitive decision.
    """
    return any(pattern.search(query) for pattern in _DICTIONARY_COMPILED)


DICTIONARY_DEFLECTION_TEMPLATES = [
    "That's a decision specific to your company -- the Corporate Advisor is the better place for that. I can explain the concepts involved here, though, if that helps.",
    "I keep to neutral definitions, not company-specific strategy -- try the Corporate Advisor for that side of it. Happy to explain any of the terms involved.",
    "That one's really a strategic call, not a lookup -- the Advisor handles those. I can define any of the terms in your question if useful.",
]

def is_direct_answer_request(query: str) -> bool:
    return any(pattern.search(query) for pattern in _COMPILED)


DEFLECTION_TEMPLATES = [
    "I can't pick for you, but I can walk through what each option actually trades off against the others -- want me to break that down?",
    "That's your call as CEO. What I can do is lay out the real trade-offs so you're deciding with the full picture.",
    "I won't tell you the 'right' answer here, but I'm glad to explain what each path costs and what it buys you.",
]


def scan_response_for_direct_advice(response: str) -> bool:
    """
    Post-generation safety net -- catches the model volunteering a
    direct recommendation even when the input itself wasn't flagged.
    """
    direct_patterns = [
        r"\byou should (choose|pick|go with|invest in)\b",
        r"\bi recommend (you |that you )?(choose|pick|go with)\b",
        r"\bthe best (option|choice|category) is\b",
        r"\bdefinitely (choose|pick|go with)\b",
    ]
    return any(re.search(p, response, re.IGNORECASE) for p in direct_patterns)