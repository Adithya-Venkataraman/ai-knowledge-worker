import structlog
from app.agents.orchestrator import AgentState, llm

log = structlog.get_logger()


async def eval_agent_node(state: AgentState) -> AgentState:
    """Score the quality of the answer."""

    question = state["question"]
    answer = state["answer"]
    log.info("eval_agent.start")

    prompt = f"""You are an evaluation expert. Score this answer from 0.0 to 1.0.

Question: {question}
Answer: {answer}

Evaluate based on:
- Relevance: does it actually answer the question?
- Accuracy: does it seem correct?
- Completeness: is it thorough enough?

Respond in exactly this format:
SCORE: <number between 0.0 and 1.0>
REASONING: <one sentence explanation>"""

    response = await llm.ainvoke(prompt)
    content = response.content

    # Parse score and reasoning
    try:
        lines = content.strip().split("\n")
        score = float(lines[0].replace("SCORE:", "").strip())
        reasoning = lines[1].replace("REASONING:", "").strip()
    except Exception:
        score = 0.5
        reasoning = "Could not parse evaluation"

    log.info("eval_agent.done", score=score)

    return {
        **state,
        "eval_score": score,
        "eval_reasoning": reasoning,
    }
