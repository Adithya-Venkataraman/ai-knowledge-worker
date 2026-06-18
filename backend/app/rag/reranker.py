from typing import List
import cohere
import structlog

from app.core.config import settings

log = structlog.get_logger()

client = cohere.AsyncClient(api_key=settings.COHERE_API_KEY)


async def rerank(query: str, chunks: List[dict], top_k: int = 5) -> List[dict]:
    """Rerank chunks by relevance to query using Cohere."""

    if not chunks:
        return []

    documents = [chunk["content"] for chunk in chunks]

    response = await client.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=documents,
        top_n=top_k,
    )

    reranked = []
    for result in response.results:
        chunk = chunks[result.index]
        chunk["rerank_score"] = result.relevance_score
        reranked.append(chunk)

    log.info("reranker.done", top_k=len(reranked))
    return reranked