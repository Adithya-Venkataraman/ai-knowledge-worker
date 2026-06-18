from pathlib import Path
import structlog

log = structlog.get_logger()

def parse_document(file_path: Path, file_type: str) -> str:
    """Parse a document and return raw text."""
    
    if file_type == "text/plain":
        return _parse_txt(file_path)
    elif file_type == "application/pdf":
        return _parse_pdf(file_path)
    elif "wordprocessingml" in file_type:
        return _parse_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def _parse_txt(file_path: Path) -> str:
    log.info("parser.txt", path=str(file_path))
    return file_path.read_text(encoding="utf-8")


def _parse_pdf(file_path: Path) -> str:
    from pypdf import PdfReader
    log.info("parser.pdf", path=str(file_path))
    reader = PdfReader(str(file_path))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def _parse_docx(file_path: Path) -> str:
    from docx import Document
    log.info("parser.docx", path=str(file_path))
    doc = Document(str(file_path))
    return "\n".join([para.text for para in doc.paragraphs])