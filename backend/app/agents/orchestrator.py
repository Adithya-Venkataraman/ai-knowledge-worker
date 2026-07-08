from typing import TypedDict, Annotated
import operator
import structlog
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from app.core.config import settings

log = structlog.get_logger()

# This is the state that flows through the entire agent graph
class AgentState(TypedDict):
    question: str
    agent_used: str
    context: str
    answer: str
    eval_score: float
    eval_reasoning: str
    messages: Annotated[list, operator.add]



llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY,
)


def route_question(state: AgentState) -> str:
    """Decide which agent to use based on the question."""

    question = state["question"].lower()

    # Simple keyword routing for now
    if any(word in question for word in ["calculate", "compute", "code", "script", "run"]):
        return "code_agent"
    elif any(word in question for word in ["today", "latest", "news", "current", "recent"]):
        return "search_agent"
    else:
        return "rag_agent"


def build_graph():
    """Build and return the LangGraph agent graph."""
    from app.agents.rag_agent import rag_agent_node
    from app.agents.code_agent import code_agent_node
    from app.agents.search_agent import search_agent_node
    from app.agents.eval_agent import eval_agent_node

    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("rag_agent", rag_agent_node)
    graph.add_node("code_agent", code_agent_node)
    graph.add_node("search_agent", search_agent_node)
    graph.add_node("eval_agent", eval_agent_node)

    # Routing — start at router, go to right agent
    graph.set_conditional_entry_point(
        route_question,
        {
            "rag_agent": "rag_agent",
            "code_agent": "code_agent",
            "search_agent": "search_agent",
        }
    )

    # After any agent → always go to eval
    graph.add_edge("rag_agent", "eval_agent")
    graph.add_edge("code_agent", "eval_agent")
    graph.add_edge("search_agent", "eval_agent")

    # After eval → done
    graph.add_edge("eval_agent", END)

    return graph.compile()


# Build once, reuse everywhere
agent_graph = build_graph()


async def run_agent(question: str, db=None) -> dict:
    """Run the full agent pipeline for a question."""

    initial_state = AgentState(
        question=question,
        agent_used="",
        context="",
        answer="",
        eval_score=0.0,
        eval_reasoning="",
        messages=[],
    )

    log.info("orchestrator.start", question=question)
    result = await agent_graph.ainvoke(initial_state)
    log.info("orchestrator.done", agent_used=result["agent_used"])

    return result
