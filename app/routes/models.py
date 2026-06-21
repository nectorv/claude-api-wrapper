"""Models listing and retrieval."""
from typing import Any
from fastapi import APIRouter, Depends
import anthropic

from ..deps import get_client, require_wrapper_auth

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
def list_models(
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    page = client.models.list(limit=50)
    return {
        "models": [
            {
                "id": m.id,
                "display_name": getattr(m, "display_name", m.id),
                "created_at": getattr(m, "created_at", None),
            }
            for m in page.data
        ]
    }


@router.get("/{model_id}")
def get_model(
    model_id: str,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    model = client.models.retrieve(model_id)
    return {
        "id": model.id,
        "display_name": getattr(model, "display_name", model.id),
        "created_at": getattr(model, "created_at", None),
    }
