# DocuMind — AI Knowledge Worker

A production-grade multi-agent AI platform that lets you upload documents and query them using RAG, code execution, and web search.

## Demo
- Upload any PDF, DOCX, or TXT document
- Ask questions in natural language
- Get answers powered by RAG + LLM agents
- See which agent answered and quality score

## Architecture
User → FastAPI → LangGraph Orchestrator
↓
┌───────────┼───────────┐
RAG Code Search
Agent Agent Agent
└───────────┼───────────┘
Eval Agent
↓
Response


## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI |
| Agents | LangGraph, LangChain |
| LLM | Ollama (llama3.2) |
| RAG | pgvector, sentence-transformers |
| Search | BM25 + semantic hybrid search |
| Reranker | Cohere |
| Database | PostgreSQL, Alembic |
| Queue | Celery + Redis |
| Frontend | Next.js, TypeScript, Tailwind |
| Infrastructure | Docker Compose |

## How it works

1. **Upload** — PDF/DOCX/TXT parsed, chunked, embedded, stored in pgvector
2. **Query** — question embedded, hybrid search finds top chunks, Cohere reranks
3. **Route** — orchestrator picks RAG, Code, or Search agent based on question
4. **Answer** — agent sends context + question to LLM, eval agent scores result

## Setup

### Prerequisites
- Docker + Docker Compose
- Python 3.11+
- Node.js 20+
- Ollama with llama3.2

### Backend
```bash
git clone https://github.com/YOUR_USERNAME/ai-knowledge-worker
cd ai-knowledge-worker

cp .env.example .env
# fill in your API keys

docker compose up -d

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Celery Worker
```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`

## API Endpoints
POST /api/documents/upload → upload document
GET /api/documents/ → list documents
GET /api/documents/{id} → get document status
DELETE /api/documents/{id} → delete document
POST /api/query → ask a question
GET /health → health check


## Project Structure

ai-knowledge-worker/
├── backend/
│ ├── app/
│ │ ├── agents/ # LangGraph agents
│ │ ├── api/routes/ # FastAPI endpoints
│ │ ├── core/ # config
│ │ ├── db/ # database session
│ │ ├── models/ # SQLAlchemy models
│ │ ├── rag/ # RAG pipeline
│ │ └── tasks/ # Celery tasks
│ ├── alembic/ # migrations
│ └── pyproject.toml
├── frontend/ # Next.js app
├── docker-compose.yml
└── .env.example


## Agents

- **RAG Agent** — searches uploaded documents using hybrid BM25 + semantic search
- **Code Agent** — writes and executes Python code for calculations
- **Search Agent** — searches the web via DuckDuckGo
- **Eval Agent** — scores answer quality 0.0-1.0




