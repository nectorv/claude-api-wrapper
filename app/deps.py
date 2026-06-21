from fastapi import Header, HTTPException, status
import anthropic

from .config import get_settings


def get_client(x_api_key: str | None = Header(None, alias="X-API-Key")) -> anthropic.Anthropic:
    settings = get_settings()
    api_key = x_api_key or settings.anthropic_api_key
    if not api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Anthropic API key")
    return anthropic.Anthropic(api_key=api_key)


def require_wrapper_auth(authorization: str | None = Header(None)):
    settings = get_settings()
    if not settings.wrapper_api_key:
        return  # no wrapper auth configured
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    token = authorization.removeprefix("Bearer ")
    if token != settings.wrapper_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid wrapper API key")
