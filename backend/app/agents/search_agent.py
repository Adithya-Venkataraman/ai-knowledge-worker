import structlog
import httpx
from app.agents.orchestrator import AgentState, llm
from app.core.config import settings

log = structlog.get_logger()


async def search_agent_node(state: AgentState) -> AgentState:
    """Search the web and answer using fresh information."""

    question = state["question"]
    log.info("search_agent.start", question=question)

    # Step 1: Search using DuckDuckGo (no API key needed)
    search_results = await _search(question)

    # Step 2: Ask Claude to answer using search results
    prompt = f"""Answer this question using the search results below.
Be concise and accurate.

Search Results:
{search_results}

Question: {question}

Answer:"""

    response = await llm.ainvoke(prompt)

    return {
        **state,
        "agent_used": "search",
        "context": search_results,
        "answer": response.content,
    }


async def _search(query: str) -> str:
    """Search DuckDuckGo and return formatted results."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": query,
                    "format": "json",
                    "no_html": 1,
                    "skip_disambig": 1,
                },
                timeout=10,
            )
            data = response.json()

        results = []

        # Abstract (main result)
        if data.get("Abstract"):
            results.append(f"Summary: {data['Abstract']}")

        # Related topics
        for topic in data.get("RelatedTopics", [])[:3]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append(f"- {topic['Text']}")

        return "\n".join(results) if results else "No results found."

    except Exception as e:
        log.error("search.failed", error=str(e))
        return "Search failed, please try again."
