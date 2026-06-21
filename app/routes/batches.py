"""Message Batches API — async bulk processing."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import BatchCreateRequest

router = APIRouter(prefix="/batches", tags=["batches"])


def _serialize(obj: Any) -> Any:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    return obj


@router.post("")
def create_batch(
    req: BatchCreateRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    requests = []
    for item in req.requests:
        p = item.params
        msg_params: dict[str, Any] = {
            "model": p.model,
            "messages": [m.model_dump(exclude_none=True) for m in p.messages],
            "max_tokens": p.max_tokens,
        }
        if p.system is not None:
            msg_params["system"] = p.system
        if p.thinking:
            msg_params["thinking"] = p.thinking.model_dump()
        if p.output_config:
            msg_params["output_config"] = p.output_config.model_dump(exclude_none=True)
        requests.append({"custom_id": item.custom_id, "params": msg_params})

    batch = client.messages.batches.create(requests=requests)
    return _serialize(batch)


@router.get("/{batch_id}")
def get_batch(
    batch_id: str,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    batch = client.messages.batches.retrieve(batch_id)
    return _serialize(batch)


@router.get("/{batch_id}/results")
def get_batch_results(
    batch_id: str,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    results = []
    for result in client.messages.batches.results(batch_id):
        results.append(_serialize(result))
    return {"batch_id": batch_id, "results": results, "count": len(results)}


@router.delete("/{batch_id}")
def cancel_batch(
    batch_id: str,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    batch = client.messages.batches.cancel(batch_id)
    return _serialize(batch)


@router.get("")
def list_batches(
    limit: int = 20,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    page = client.messages.batches.list(limit=limit)
    return {"batches": [_serialize(b) for b in page.data], "has_more": page.has_more}
