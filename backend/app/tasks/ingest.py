import asyncio
import uuid
from pathlib import Path
import structlog

from app.tasks.celery_app import celery_app
from app.core.config import settings

log = structlog.get_logger()


@celery_app.task(bind=True, max_retries=3)
def ingest_document(self, doc_id: str):
    """Background task: parse → chunk → embed → store."""
    asyncio.run(_ingest(doc_id))


async def _ingest(doc_id: str):
    from app.db.session import AsyncSessionLocal
    from app.models.document import Document, DocumentChunk
    from app.rag.parser import parse_document
    from app.rag.chunker import chunk_text
    from app.rag.embeddings import embed_texts

    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, uuid.UUID(doc_id))
        if not doc:
            log.error("ingest.doc_not_found", doc_id=doc_id)
            return

        try:
            doc.status = "processing"
            await db.commit()

            # find the uploaded file
            upload_dir = Path(settings.UPLOAD_DIR) / doc_id
            file_path = next(upload_dir.iterdir())

            # parse → chunk → embed
            text = parse_document(file_path, doc.file_type)
            chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
            log.info("ingest.chunked", n_chunks=len(chunks))

            embeddings = await embed_texts(chunks)

            # save chunks to database
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                db.add(DocumentChunk(
                    document_id=doc.id,
                    chunk_index=i,
                    content=chunk,
                    embedding=embedding,
                ))

            doc.status = "ready"
            await db.commit()
            log.info("ingest.done", doc_id=doc_id)

        except Exception as exc:
            log.error("ingest.failed", doc_id=doc_id, error=str(exc))
            doc.status = "failed"
            doc.error = str(exc)
            await db.commit()
            raise
