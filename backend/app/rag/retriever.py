from typing import List
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.rag.embeddings import embed_query

log = structlog.get_logger()


async def semantic_search(
    query: str,
    db: AsyncSession,
    top_k: int = 20,
) -> List[dict]:
    """Find most similar chunks to the query using vector search."""

    query_embedding = await embed_query(query)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    result = await db.execute(
        text("""
            SELECT 
                dc.id,
                dc.content,
                dc.document_id,
                1 - (dc.embedding <=> CAST(:embedding AS vector)) as similarity
            FROM document_chunks dc
            WHERE dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """),
        {"embedding": embedding_str, "top_k": top_k}
    )

    rows = result.fetchall()
    return [
        {
            "id": str(row.id),
            "content": row.content,
            "document_id": str(row.document_id),
            "similarity": row.similarity,
        }
        for row in rows
    ]
async def bm25_search(
    query: str,
    db: AsyncSession,
    top_k: int = 20,
) -> List[dict]:
    """Find chunks matching query keywords using BM25."""

    result = await db.execute(
        text("""
            SELECT
                dc.id,
                dc.content,
                dc.document_id,
                ts_rank(
                    to_tsvector('english', dc.content),
                    plainto_tsquery('english', :query)
                ) as rank
            FROM document_chunks dc
            WHERE to_tsvector('english', dc.content) 
                @@ plainto_tsquery('english', :query)
            ORDER BY rank DESC
            LIMIT :top_k
        """),
        {"query": query, "top_k": top_k}
    )

    rows = result.fetchall()
    return [
        {
            "id": str(row.id),
            "content": row.content,
            "document_id": str(row.document_id),
            "similarity": float(row.rank),
        }
        for row in rows
    ]


async def hybrid_search(
    query: str,
    db: AsyncSession,
    top_k: int = 20,
) -> List[dict]:
    """Combine semantic and BM25 search results."""

    semantic_results = await semantic_search(query, db, top_k)
    bm25_results = await bm25_search(query, db, top_k)

    # Combine and deduplicate by chunk id
    seen = set()
    combined = []

    for chunk in semantic_results + bm25_results:
        if chunk["id"] not in seen:
            seen.add(chunk["id"])
            combined.append(chunk)

    log.info("hybrid_search.done", total=len(combined))
    return combined