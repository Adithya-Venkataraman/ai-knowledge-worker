from typing import List
import structlog

log = structlog.get_logger()


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> List[str]:
    """Split text into overlapping chunks by word count."""
    
    if not text or not text.strip():
        return []

    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap

    log.info("chunker.done", total_chunks=len(chunks), chunk_size=chunk_size, overlap=overlap)
    return chunks