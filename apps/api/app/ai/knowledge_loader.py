import hashlib
from pathlib import Path

import yaml

CONCEPTS_DIR = Path(__file__).parent / "knowledge_base" / "concepts"


def parse_concept_text(text: str) -> dict:
    """
    Pure function -- takes raw file text, returns structured data.
    No file I/O here on purpose, so this is fully unit-testable
    without touching disk.
    """
    _, frontmatter_raw, body = text.split("---", 2)
    meta = yaml.safe_load(frontmatter_raw)
    body = body.strip()

    content_hash = hashlib.sha256(
        f"{meta['domain']}|{meta['title']}|{body}".encode("utf-8")
    ).hexdigest()

    return {
        "domain": meta["domain"],
        "title": meta["title"],
        "related_terms": meta.get("related_terms", []),
        "body": body,
        "content_hash": content_hash,
    }


def load_all_concepts() -> list[dict]:
    concepts = []
    for md_file in CONCEPTS_DIR.rglob("*.md"):
        parsed = parse_concept_text(md_file.read_text(encoding="utf-8"))
        parsed["id"] = f"{parsed['domain']}:{md_file.stem}"
        concepts.append(parsed)
    return concepts