"""Files API — upload, list, get metadata, delete."""
from typing import Any
from fastapi import APIRouter, Depends, UploadFile, File
import anthropic

from ..deps import get_client, require_wrapper_auth

router = APIRouter(prefix="/files", tags=["files"])


def _serialize(obj: Any) -> Any:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    return obj


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    content = await file.read()
    result = client.beta.files.upload(
        file=(file.filename or "upload", content, file.content_type or "application/octet-stream"),
        betas=["files-api-2025-04-14"],
    )
    return _serialize(result)


@router.get("")
def list_files(
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    page = client.beta.files.list(betas=["files-api-2025-04-14"])
    return {"files": [_serialize(f) for f in page.data]}


@router.get("/{file_id}")
def get_file(
    file_id: str,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    meta = client.beta.files.retrieve_metadata(file_id, betas=["files-api-2025-04-14"])
    return _serialize(meta)


@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    client: anthropic.Anthropic = Depends(get_client),
    _auth=Depends(require_wrapper_auth),
) -> dict[str, Any]:
    client.beta.files.delete(file_id, betas=["files-api-2025-04-14"])
    return {"deleted": True, "file_id": file_id}
