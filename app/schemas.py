from typing import Any, Optional, Union
from pydantic import BaseModel, Field


# ── Shared ──────────────────────────────────────────────────────────────────

class ImageSource(BaseModel):
    type: str = "base64"                  # "base64" | "url"
    media_type: Optional[str] = None      # "image/jpeg" | "image/png" | …
    data: Optional[str] = None            # base64 string
    url: Optional[str] = None


class ImageContent(BaseModel):
    type: str = "image"
    source: ImageSource


class TextContent(BaseModel):
    type: str = "text"
    text: str


class ToolUseContent(BaseModel):
    type: str = "tool_use"
    id: str
    name: str
    input: dict[str, Any]


class ToolResultContent(BaseModel):
    type: str = "tool_result"
    tool_use_id: str
    content: Union[str, list[dict[str, Any]]]


MessageContent = Union[str, list[Union[TextContent, ImageContent, ToolUseContent, ToolResultContent]]]


class Message(BaseModel):
    role: str
    content: MessageContent


class CacheControlEphemeral(BaseModel):
    type: str = "ephemeral"


class ThinkingParam(BaseModel):
    type: str = "adaptive"               # "adaptive" | "disabled"


class OutputConfigFormat(BaseModel):
    type: str = "json_schema"
    json_schema: dict[str, Any]


class OutputConfig(BaseModel):
    format: Optional[OutputConfigFormat] = None
    effort: Optional[str] = None         # "low" | "medium" | "high" | "xhigh" | "max"


# ── Messages ────────────────────────────────────────────────────────────────

class MessagesRequest(BaseModel):
    model: str = "claude-opus-4-8"
    messages: list[Message]
    max_tokens: int = 8096
    system: Optional[Union[str, list[dict[str, Any]]]] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    stop_sequences: Optional[list[str]] = None
    thinking: Optional[ThinkingParam] = None
    output_config: Optional[OutputConfig] = None
    metadata: Optional[dict[str, Any]] = None
    stream: bool = False


class StreamingRequest(MessagesRequest):
    stream: bool = True


# ── Thinking ────────────────────────────────────────────────────────────────

class ThinkingRequest(BaseModel):
    model: str = "claude-opus-4-8"
    messages: list[Message]
    max_tokens: int = 16000
    system: Optional[str] = None
    effort: Optional[str] = None         # controls depth via output_config.effort


# ── Vision ──────────────────────────────────────────────────────────────────

class VisionRequest(BaseModel):
    model: str = "claude-opus-4-8"
    prompt: str
    images: list[ImageSource]
    max_tokens: int = 4096
    system: Optional[str] = None
    thinking: Optional[ThinkingParam] = None


# ── Structured output ────────────────────────────────────────────────────────

class StructuredRequest(BaseModel):
    model: str = "claude-opus-4-8"
    messages: list[Message]
    output_schema: dict[str, Any] = Field(..., description="JSON Schema for the expected output")
    max_tokens: int = 4096
    system: Optional[str] = None
    thinking: Optional[ThinkingParam] = None


# ── Tool use ────────────────────────────────────────────────────────────────

class ToolDefinition(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any]


class ToolsRequest(BaseModel):
    model: str = "claude-opus-4-8"
    messages: list[Message]
    tools: list[ToolDefinition]
    max_tokens: int = 4096
    system: Optional[str] = None
    max_iterations: int = Field(10, le=50)
    thinking: Optional[ThinkingParam] = None


# ── Prompt caching ───────────────────────────────────────────────────────────

class CachedSystemBlock(BaseModel):
    type: str = "text"
    text: str
    cache_control: Optional[CacheControlEphemeral] = CacheControlEphemeral()


class CachingRequest(BaseModel):
    model: str = "claude-opus-4-8"
    messages: list[Message]
    system: list[CachedSystemBlock]
    max_tokens: int = 4096
    thinking: Optional[ThinkingParam] = None


# ── Token counting ───────────────────────────────────────────────────────────

class TokenCountRequest(BaseModel):
    model: str = "claude-opus-4-8"
    messages: list[Message]
    system: Optional[Union[str, list[dict[str, Any]]]] = None
    tools: Optional[list[ToolDefinition]] = None
    thinking: Optional[ThinkingParam] = None


# ── Batches ──────────────────────────────────────────────────────────────────

class BatchItem(BaseModel):
    custom_id: str
    params: MessagesRequest


class BatchCreateRequest(BaseModel):
    requests: list[BatchItem]


# ── Conversations ────────────────────────────────────────────────────────────

class ConversationCreateRequest(BaseModel):
    system: Optional[str] = None
    model: str = "claude-opus-4-8"
    max_tokens: int = 4096
    thinking: Optional[ThinkingParam] = None


class ConversationMessageRequest(BaseModel):
    content: Union[str, list[dict[str, Any]]]
    stream: bool = False


class CompactionRequest(BaseModel):
    summary_prompt: str = (
        "Summarize this conversation concisely, preserving all key facts, decisions, and context."
    )
    model: str = "claude-opus-4-8"
    max_tokens: int = 2048
