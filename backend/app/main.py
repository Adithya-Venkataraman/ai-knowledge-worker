from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine
from app.models.base import Base

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", environment=settings.ENVIRONMENT)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    log.info("shutdown")
    await engine.dispose()


app = FastAPI(
    title="AI Knowledge Worker",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/api/query")
async def query(body: dict):
    from app.agents.orchestrator import run_agent
    question = body.get("question", "")
    if not question:
        return {"error": "question is required"}
    result = await run_agent(question)
    return {
        "answer": result["answer"],
        "agent_used": result["agent_used"],
        "eval_score": result["eval_score"],
        "eval_reasoning": result["eval_reasoning"],
    }
