"""Prompt caching — mark system blocks with cache_control: {type: ephemeral}."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import CachingRequest

router = APIRouter(prefix="/messages/cached", tags=["caching"])


@router.post("")
def cached_message(
    req: CachingRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    system_blocks = [b.model_dump(exclude_none=True) for b in req.system]
    params: dict[str, Any] = {
        "model": req.model,
        "messages": [m.model_dump(exclude_none=True) for m in req.messages],
        "max_tokens": req.max_tokens,
        "system": system_blocks,
        "extra_headers": {"anthropic-beta": "prompt-caching-2024-07-31"},
    }
    if req.thinking:
        params["thinking"] = req.thinking.model_dump()

    response = client.messages.create(**params)
    result = response.model_dump()
    result["cache_metrics"] = result.get("usage", {})
    return result
