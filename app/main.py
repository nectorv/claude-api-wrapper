from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import (
    batches, caching, conversations, files,
    messages, models, streaming, structured,
    thinking, tokens, tools, vision,
)

app = FastAPI(
    title="Claude API Wrapper",
    description=(
        "A comprehensive FastAPI wrapper for the Anthropic Claude API — "
        "streaming, adaptive thinking, tool use, vision, batches, files, "
        "structured outputs, prompt caching, token counting, and multi-turn conversations."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [
    messages.router,
    streaming.router,
    thinking.router,
    vision.router,
    structured.router,
    caching.router,
    tools.router,
    tokens.router,
    batches.router,
    files.router,
    conversations.router,
    models.router,
]:
    app.include_router(router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "claude-api-wrapper"}


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
    return {
        "service": "Claude API Wrapper",
        "docs": "/docs",
        "health": "/health",
    }
