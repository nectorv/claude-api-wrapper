"""Multi-turn conversations with in-memory session management and compaction."""
import uuid
from typing import Any, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import anthropic
import json

from ..deps import get_client, require_wrapper_auth
from ..schemas import ConversationCreateRequest, ConversationMessageRequest, CompactionRequest

router = APIRouter(prefix="/conversations", tags=["conversations"])

# In-memory store — swap for Redis/DB in production
_sessions: dict[str, dict[str, Any]] = {}


@router.post("")
def create_conversation(
    req: ConversationCreateRequest,
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    conv_id = str(uuid.uuid4())
    _sessions[conv_id] = {
        "id": conv_id,
        "model": req.model,
        "max_tokens": req.max_tokens,
        "system": req.system,
        "thinking": req.thinking.model_dump() if req.thinking else {"type": "adaptive"},
        "messages": [],
        "total_tokens": 0,
    }
    return {"conversation_id": conv_id, "model": req.model}


@router.get("/{conv_id}")
def get_conversation(
    conv_id: str,
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    session = _sessions.get(conv_id)
    if not session:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return session


@router.delete("/{conv_id}")
def delete_conversation(
    conv_id: str,
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    if conv_id not in _sessions:
        raise HTTPException(status_code=404, detail="Conversation not found")
    del _sessions[conv_id]
    return {"deleted": True, "conversation_id": conv_id}


@router.post("/{conv_id}/messages")
def send_message(
    conv_id: str,
    req: ConversationMessageRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> Any:
    session = _sessions.get(conv_id)
    if not session:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_content = req.content if isinstance(req.content, str) else req.content
    session["messages"].append({"role": "user", "content": user_content})

    params: dict[str, Any] = {
        "model": session["model"],
        "messages": session["messages"],
        "max_tokens": session["max_tokens"],
    }
    if session.get("system"):
        params["system"] = session["system"]
    if session.get("thinking"):
        params["thinking"] = session["thinking"]

    if req.stream:
        return StreamingResponse(
            _stream_turn(client, params, session),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache"},
        )

    response = client.messages.create(**params)
    _record_turn(session, response)
    return {
        "conversation_id": conv_id,
        "response": response.model_dump(),
        "total_tokens": session["total_tokens"],
    }


async def _stream_turn(
    client: anthropic.Anthropic,
    params: dict[str, Any],
    session: dict[str, Any],
) -> AsyncGenerator[str, None]:
    with client.messages.stream(**params) as stream:
        for event in stream:
            try:
                data = event.model_dump() if hasattr(event, "model_dump") else {}
            except Exception:
                data = {}
            data["event_type"] = type(event).__name__
            yield f"data: {json.dumps(data)}\n\n"

        final = stream.get_final_message()
        _record_turn(session, final)
        yield f"data: {json.dumps({'event_type': 'final_message', 'total_tokens': session['total_tokens'], **final.model_dump()})}\n\n"

    yield "data: [DONE]\n\n"


def _record_turn(session: dict[str, Any], response: Any) -> None:
    content = response.content
    text = " ".join(b.text for b in content if hasattr(b, "text") and b.type == "text")
    session["messages"].append({"role": "assistant", "content": text or [b.model_dump() for b in content]})
    usage = response.usage
    if usage:
        session["total_tokens"] += (usage.input_tokens or 0) + (usage.output_tokens or 0)


@router.post("/{conv_id}/compact")
def compact_conversation(
    conv_id: str,
    req: CompactionRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    """Summarize the conversation history and replace it with a compact summary."""
    session = _sessions.get(conv_id)
    if not session:
        raise HTTPException(status_code=404, detail="Conversation not found")

    history_text = json.dumps(session["messages"], indent=2)
    summary_response = client.messages.create(
        model=req.model,
        messages=[
            {"role": "user", "content": f"{req.summary_prompt}\n\n<conversation>\n{history_text}\n</conversation>"},
        ],
        max_tokens=req.max_tokens,
    )
    summary = summary_response.content[0].text if summary_response.content else ""
    original_count = len(session["messages"])

    session["messages"] = [
        {"role": "user", "content": f"[Conversation summary]\n{summary}"},
        {"role": "assistant", "content": "Understood, I have context from the summary above."},
    ]

    return {
        "conversation_id": conv_id,
        "compacted": True,
        "original_message_count": original_count,
        "new_message_count": len(session["messages"]),
        "summary": summary,
    }
