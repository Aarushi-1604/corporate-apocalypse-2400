import chromadb

from app.core.config import get_settings

_client = None


def get_chroma_client():
    global _client
    if _client is None:
        settings = get_settings()
        _client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    return _client


def get_concepts_collection():
    return get_chroma_client().get_or_create_collection("concepts")