"""Adaptive thinking — deep reasoning with configurable effort."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import ThinkingRequest

router = APIRouter(prefix="/messages/thinking", tags=["thinking"])


@router.post("")
def think(
    req: ThinkingRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "model": req.model,
        "messages": [m.model_dump(exclude_none=True) for m in req.messages],
        "max_tokens": req.max_tokens,
    }
    if req.system:
        params["system"] = req.system

    # Fable 5 / Opus 4.8 / 4.7 → adaptive only; older models can use budget_tokens
    is_adaptive_only = any(x in req.model for x in ("4-7", "4-8", "fable", "mythos"))
    if is_adaptive_only:
        params["thinking"] = {"type": "adaptive"}
    else:
        params["thinking"] = {"type": "enabled", "budget_tokens": 10000}

    if req.effort:
        params.setdefault("output_config", {})["effort"] = req.effort

    with client.messages.stream(**params) as stream:
        final = stream.get_final_message()

    result = final.model_dump()
    result["thinking_blocks"] = [
        b for b in (result.get("content") or []) if b.get("type") == "thinking"
    ]
    result["text_blocks"] = [
        b for b in (result.get("content") or []) if b.get("type") == "text"
    ]
    return result
