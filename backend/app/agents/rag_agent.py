import structlog
from app.agents.orchestrator import AgentState, llm
from app.rag.pipeline import retrieve, format_context
from app.db.session import AsyncSessionLocal

log = structlog.get_logger()


async def rag_agent_node(state: AgentState) -> AgentState:
    """Retrieve relevant chunks and answer using Claude."""

    question = state["question"]
    log.info("rag_agent.start", question=question)

    async with AsyncSessionLocal() as db:
        chunks = await retrieve(question, db)

    context = format_context(chunks)

    prompt = f"""You are a helpful assistant. Answer the question using 
only the context provided below. If the answer isn't in the context, 
say so clearly.

Context:
{context}

Question: {question}

Answer:"""

    response = await llm.ainvoke(prompt)

    return {
        **state,
        "agent_used": "rag",
        "context": context,
        "answer": response.content,
    }
