"""Vision / multimodal — base64 or URL images."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth
from ..schemas import VisionRequest

router = APIRouter(prefix="/messages/vision", tags=["vision"])


def _build_image_block(src) -> dict[str, Any]:
    if src.type == "url":
        return {"type": "image", "source": {"type": "url", "url": src.url}}
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": src.media_type or "image/jpeg",
            "data": src.data,
        },
    }


@router.post("")
def analyze_images(
    req: VisionRequest,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    content: list[dict[str, Any]] = [_build_image_block(img) for img in req.images]
    content.append({"type": "text", "text": req.prompt})

    params: dict[str, Any] = {
        "model": req.model,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": req.max_tokens,
    }
    if req.system:
        params["system"] = req.system
    if req.thinking:
        params["thinking"] = req.thinking.model_dump()

    response = client.messages.create(**params)
    return response.model_dump()
