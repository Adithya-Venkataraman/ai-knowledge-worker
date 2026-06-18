from typing import List
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.rag.retriever import hybrid_search
from app.rag.reranker import rerank

log = structlog.get_logger()


async def retrieve(
    query: str,
    db: AsyncSession,
    top_k: int = 5,
) -> List[dict]:
    """Full RAG retrieval pipeline."""

    # Step 1: hybrid search
    chunks = await hybrid_search(query, db, top_k=20)

    if not chunks:
        log.info("pipeline.no_chunks_found")
        return []

    # Step 2: rerank
    reranked = await rerank(query, chunks, top_k=top_k)

    log.info("pipeline.done", n_chunks=len(reranked))
    return reranked


def format_context(chunks: List[dict]) -> str:
    """Format chunks into a string for the LLM prompt."""

    if not chunks:
        return "No relevant context found."

    context = ""
    for i, chunk in enumerate(chunks, 1):
        context += f"\n[Chunk {i}]\n{chunk['content']}\n"

    return context