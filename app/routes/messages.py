"""Basic messages endpoint — supports all params including thinking & structured output."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import MessagesRequest

router = APIRouter(prefix="/messages", tags=["messages"])


def _build_params(req: MessagesRequest) -> dict[str, Any]:
    messages = [m.model_dump(exclude_none=True) for m in req.messages]
    params: dict[str, Any] = {
        "model": req.model,
        "messages": messages,
        "max_tokens": req.max_tokens,
    }
    if req.system is not None:
        params["system"] = req.system if isinstance(req.system, str) else req.system
    if req.stop_sequences:
        params["stop_sequences"] = req.stop_sequences
    if req.metadata:
        params["metadata"] = req.metadata

    # Thinking — adaptive only for 4.7+ / Fable 5
    is_new_family = any(x in req.model for x in ("4-7", "4-8", "fable", "mythos"))
    if req.thinking:
        params["thinking"] = req.thinking.model_dump()
    elif is_new_family:
        params["thinking"] = {"type": "adaptive"}

    # Sampling params only when thinking is disabled
    thinking_active = params.get("thinking", {}).get("type") != "disabled"
    if not thinking_active:
        if req.temperature is not None:
            params["temperature"] = req.temperature
        if req.top_p is not None:
            params["top_p"] = req.top_p
        if req.top_k is not None:
            params["top_k"] = req.top_k

    if req.output_config:
        params["output_config"] = req.output_config.model_dump(exclude_none=True)

    return params


@router.post("")
def create_message(
    req: MessagesRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    params = _build_params(req)
    response = client.messages.create(**params)
    return response.model_dump()
