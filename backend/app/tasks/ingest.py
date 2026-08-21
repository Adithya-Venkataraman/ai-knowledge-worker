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
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from app.models.document import Document, DocumentChunk
    from app.rag.parser import parse_document
    from app.rag.chunker import chunk_text
    from app.rag.embeddings import embed_texts

    # create fresh engine for this task
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        try:
            doc = await db.get(Document, uuid.UUID(doc_id))
            if not doc:
                log.error("ingest.doc_not_found", doc_id=doc_id)
                return

            doc.status = "processing"
            await db.commit()

            upload_dir = Path(settings.UPLOAD_DIR) / doc_id
            file_path = next(upload_dir.iterdir())

            text = parse_document(file_path, doc.file_type)
            
            if not text or not text.strip():
                log.warning("ingest.empty_text", doc_id=doc_id)
                doc.status = "failed"
                doc.error = "No text could be extracted from document"
                await db.commit()
                return

            chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
            log.info("ingest.chunked", n_chunks=len(chunks))

            embeddings = await embed_texts(chunks)

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
            try:
                doc.status = "failed"
                doc.error = str(exc)
                await db.commit()
            except:
                pass
            raise

    await engine.dispose()