from typing import List
import openai
import structlog

from app.core.config import settings

log = structlog.get_logger()

client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Convert a list of text chunks into embeddings."""
    
    if not texts:
        return []

    log.info("embeddings.start", n_texts=len(texts))

    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=texts,
    )

    embeddings = [item.embedding for item in response.data]
    
    log.info("embeddings.done", n_embeddings=len(embeddings))
    return embeddings


async def embed_query(query: str) -> List[float]:
    """Convert a single query string into an embedding."""
    
    results = await embed_texts([query])
    return results[0]