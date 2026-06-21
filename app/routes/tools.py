"""Tool use — manual agentic loop until stop_reason is 'end_turn'."""
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import ToolsRequest

router = APIRouter(prefix="/tools", tags=["tools"])

# Built-in server-side tool declarations
BUILTIN_TOOLS = {
    "web_search": {
        "type": "web_search_20250305",
        "name": "web_search",
    },
    "code_execution": {
        "type": "code_execution_20250522",
        "name": "code_execution",
    },
}


@router.post("/run")
def run_with_tools(
    req: ToolsRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    messages: list[dict[str, Any]] = [m.model_dump(exclude_none=True) for m in req.messages]
    tools = [t.model_dump() for t in req.tools]

    params: dict[str, Any] = {
        "model": req.model,
        "max_tokens": req.max_tokens,
        "tools": tools,
    }
    if req.system:
        params["system"] = req.system
    if req.thinking:
        params["thinking"] = req.thinking.model_dump()

    iterations = 0
    tool_calls: list[dict[str, Any]] = []

    while iterations < req.max_iterations:
        iterations += 1
        params["messages"] = messages
        response = client.messages.create(**params)

        if response.stop_reason == "end_turn" or response.stop_reason == "refusal":
            return {
                "final_response": response.model_dump(),
                "iterations": iterations,
                "tool_calls": tool_calls,
            }

        if response.stop_reason == "tool_use":
            # Record tool calls and build tool_result messages
            result_contents: list[dict[str, Any]] = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_calls.append({"name": block.name, "input": block.input, "id": block.id})
                    # Return placeholder result — callers can hook real executors via /tools/execute
                    result_contents.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": f"[Tool '{block.name}' called with: {block.input}. Provide real implementation.]",
                    })

            messages.append({"role": "assistant", "content": [b.model_dump() for b in response.content]})
            messages.append({"role": "user", "content": result_contents})
        else:
            # Unexpected stop reason — surface it
            return {
                "final_response": response.model_dump(),
                "iterations": iterations,
                "tool_calls": tool_calls,
                "stop_reason": response.stop_reason,
            }

    raise HTTPException(status_code=400, detail=f"Exceeded max_iterations={req.max_iterations}")


@router.post("/web-search")
def web_search_tool(
    req: ToolsRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    """Use Claude's built-in server-side web_search tool."""
    params: dict[str, Any] = {
        "model": req.model,
        "messages": [m.model_dump(exclude_none=True) for m in req.messages],
        "max_tokens": req.max_tokens,
        "tools": [BUILTIN_TOOLS["web_search"]],
    }
    if req.system:
        params["system"] = req.system

    with client.messages.stream(**params) as stream:
        final = stream.get_final_message()
    return final.model_dump()


@router.post("/code-execution")
def code_execution_tool(
    req: ToolsRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    """Use Claude's built-in server-side code_execution tool."""
    params: dict[str, Any] = {
        "model": req.model,
        "messages": [m.model_dump(exclude_none=True) for m in req.messages],
        "max_tokens": req.max_tokens,
        "tools": [BUILTIN_TOOLS["code_execution"]],
    }
    if req.system:
        params["system"] = req.system

    with client.messages.stream(**params) as stream:
        final = stream.get_final_message()
    return final.model_dump()
