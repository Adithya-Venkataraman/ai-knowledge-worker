import structlog
import subprocess
import tempfile
import os
from app.agents.orchestrator import AgentState, llm

log = structlog.get_logger()


async def code_agent_node(state: AgentState) -> AgentState:
    """Write and execute Python code to answer the question."""

    question = state["question"]
    log.info("code_agent.start", question=question)

    # Step 1: Ask Claude to write code
    prompt = f"""Write a Python script to answer this question:
{question}

Rules:
- Only use standard library modules
- Print the final answer at the end
- Keep it simple and focused
- No explanations, just the code

Code:"""

    response = await llm.ainvoke(prompt)
    code = response.content

    # Clean up markdown if Claude wraps in code blocks
    code = code.replace("```python", "").replace("```", "").strip()

    # Step 2: Run the code safely
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as f:
            f.write(code)
            tmp_path = f.name

        result = subprocess.run(
            ["python3", tmp_path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        output = result.stdout.strip() or result.stderr.strip()

    except subprocess.TimeoutExpired:
        output = "Code execution timed out after 10 seconds"
    except Exception as e:
        output = f"Execution error: {str(e)}"
    finally:
        os.unlink(tmp_path)

    answer = f"I wrote and ran this code:\n\n```python\n{code}\n```\n\nOutput: {output}"

    return {
        **state,
        "agent_used": "code",
        "answer": answer,
    }
