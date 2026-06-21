"""Token counting — estimate cost before a real call."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import TokenCountRequest

router = APIRouter(prefix="/tokens", tags=["tokens"])

# Pricing per 1M tokens (input / output)
_PRICING: dict[str, tuple[float, float]] = {
    "claude-fable-5": (10.0, 50.0),
    "claude-mythos-5": (10.0, 50.0),
    "claude-opus-4-8": (5.0, 25.0),
    "claude-opus-4-7": (5.0, 25.0),
    "claude-opus-4-6": (5.0, 25.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
}


@router.post("/count")
def count_tokens(
    req: TokenCountRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "model": req.model,
        "messages": [m.model_dump(exclude_none=True) for m in req.messages],
    }
    if req.system is not None:
        params["system"] = req.system
    if req.tools:
        params["tools"] = [t.model_dump() for t in req.tools]
    if req.thinking:
        params["thinking"] = req.thinking.model_dump()

    result = client.messages.count_tokens(**params)
    input_tokens: int = result.input_tokens

    prices = _PRICING.get(req.model, (5.0, 25.0))
    estimated_cost_usd = (input_tokens / 1_000_000) * prices[0]

    return {
        "model": req.model,
        "input_tokens": input_tokens,
        "estimated_input_cost_usd": round(estimated_cost_usd, 6),
        "pricing_per_1m_input": prices[0],
        "pricing_per_1m_output": prices[1],
    }
