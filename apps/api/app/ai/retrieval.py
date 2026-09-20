from app.ai.chroma_client import get_concepts_collection
from app.ai.ollama_client import get_embedding


async def retrieve_concepts(query: str, top_k: int = 3) -> list[dict]:
    embedding = await get_embedding(query)
    collection = get_concepts_collection()

    results = collection.query(query_embeddings=[embedding], n_results=top_k)

    concepts = []
    for i in range(len(results["ids"][0])):
        meta = results["metadatas"][0][i]
        concepts.append({
            "title": meta["title"],
            "domain": meta["domain"],
            "body": results["documents"][0][i],
            "distance": results["distances"][0][i],
        })
    return concepts