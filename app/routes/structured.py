"""Structured outputs — constrains response to a JSON schema."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import StructuredRequest

router = APIRouter(prefix="/messages/structured", tags=["structured"])


@router.post("")
def structured_output(
    req: StructuredRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "model": req.model,
        "messages": [m.model_dump(exclude_none=True) for m in req.messages],
        "max_tokens": req.max_tokens,
        "output_config": {
            "format": {
                "type": "json_schema",
                "json_schema": req.output_schema,
            }
        },
    }
    if req.system:
        params["system"] = req.system
    if req.thinking:
        params["thinking"] = req.thinking.model_dump()

    response = client.messages.create(**params)
    result = response.model_dump()

    # Extract parsed JSON from text block
    import json
    for block in result.get("content", []):
        if block.get("type") == "text":
            try:
                result["parsed"] = json.loads(block["text"])
            except json.JSONDecodeError:
                result["parsed"] = None
            break

    return result
