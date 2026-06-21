"""SSE streaming endpoint."""
from typing import Any, AsyncGenerator
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import anthropic
import json

from ..deps import get_client, require_wrapper_auth
from ..schemas import MessagesRequest
from .messages import _build_params

router = APIRouter(prefix="/messages", tags=["streaming"])


async def _event_stream(client: anthropic.Anthropic, params: dict[str, Any]) -> AsyncGenerator[str, None]:
    with client.messages.stream(**params) as stream:
        for event in stream:
            event_type = type(event).__name__
            try:
                data = event.model_dump() if hasattr(event, "model_dump") else {"type": event_type}
            except Exception:
                data = {"type": event_type}
            data["event_type"] = event_type
            yield f"data: {json.dumps(data)}\n\n"

        final = stream.get_final_message()
        yield f"data: {json.dumps({'event_type': 'final_message', **final.model_dump()})}\n\n"

    yield "data: [DONE]\n\n"


@router.post("/stream")
def stream_message(
    req: MessagesRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> StreamingResponse:
    params = _build_params(req)
    return StreamingResponse(
        _event_stream(client, params),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
