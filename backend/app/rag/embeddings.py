from typing import List
import structlog

log = structlog.get_logger()

# Load once, reuse everywhere
_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        log.info("embeddings.loading_model")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        log.info("embeddings.model_loaded")
    return _model


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Convert a list of text chunks into embeddings."""
    if not texts:
        return []

    log.info("embeddings.start", n_texts=len(texts))
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    log.info("embeddings.done", n_embeddings=len(embeddings))
    return embeddings.tolist()


async def embed_query(query: str) -> List[float]:
    """Convert a single query string into an embedding."""
    results = await embed_texts([query])
    return results[0]