import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.db.session import get_db
from app.models.document import Document
from app.tasks.ingest import ingest_document

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Unsupported file type. Use PDF, DOCX, or TXT.")

    # validate file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")

    # save document record to postgres
    doc = Document(
        filename=file.filename,
        file_type=file.content_type,
        file_size=len(content),
        status="pending",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # save file to disk
    upload_path = Path(settings.UPLOAD_DIR) / str(doc.id)
    upload_path.mkdir(parents=True, exist_ok=True)
    (upload_path / file.filename).write_bytes(content)

    # kick off background processing
    ingest_document.delay(str(doc.id))

    return {
        "id": str(doc.id),
        "filename": file.filename,
        "status": "processing",
        "message": "Document uploaded successfully, processing in background"
    }


@router.get("/")
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "filename": d.filename,
            "status": d.status,
            "created_at": d.created_at.isoformat()
        }
        for d in docs
    ]


@router.get("/{doc_id}")
async def get_document(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return {
        "id": str(doc.id),
        "filename": doc.filename,
        "status": doc.status,
        "error": doc.error,
        "created_at": doc.created_at.isoformat()
    }
