"""
Run manually to (re-)embed the knowledge base into ChromaDB:
    poetry run python -m app.ai.ingest

Idempotent -- only re-embeds concepts whose content_hash has changed
since last run.
"""
import asyncio

from app.ai.chroma_client import get_concepts_collection
from app.ai.knowledge_loader import load_all_concepts
from app.ai.ollama_client import get_embedding


async def run_ingestion() -> None:
    concepts = load_all_concepts()
    collection = get_concepts_collection()

    existing = collection.get(ids=[c["id"] for c in concepts], include=["metadatas"])
    existing_hashes = {
        id_: meta["content_hash"]
        for id_, meta in zip(existing["ids"], existing["metadatas"])
    }

    to_embed = [c for c in concepts if existing_hashes.get(c["id"]) != c["content_hash"]]

    print(f"{len(concepts)} concepts total, {len(to_embed)} need (re-)embedding.")

    for concept in to_embed:
        embedding = await get_embedding(f"{concept['title']}: {concept['body']}")
        collection.upsert(
            ids=[concept["id"]],
            embeddings=[embedding],
            documents=[concept["body"]],
            metadatas=[{
                "domain": concept["domain"],
                "title": concept["title"],
                "related_terms": ",".join(concept["related_terms"]),
                "content_hash": concept["content_hash"],
            }],
        )
        print(f"  embedded: {concept['id']}")

    print("Ingestion complete.")


if __name__ == "__main__":
    asyncio.run(run_ingestion())