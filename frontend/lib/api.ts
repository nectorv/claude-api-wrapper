const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Conversations ────────────────────────────────────────────────────────────

export async function createConversation(params: {
  model: string
  system?: string
  max_tokens?: number
  thinking?: { type: 'adaptive' } | { type: 'disabled' }
}): Promise<{ conversation_id: string; model: string }> {
  return req('/conversations', {
    method: 'POST',
    body: JSON.stringify({ max_tokens: 8096, ...params }),
  })
}

export async function sendStreamingMessage(
  conversationId: string,
  content: string,
  signal?: AbortSignal
): Promise<Response> {
  const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, stream: true }),
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await fetch(`${BASE}/conversations/${conversationId}`, { method: 'DELETE' })
}

export async function compactConversation(conversationId: string): Promise<{ summary: string }> {
  return req(`/conversations/${conversationId}/compact`, { method: 'POST', body: '{}' })
}

// ── Vision ───────────────────────────────────────────────────────────────────

export async function analyzeImage(params: {
  model: string
  prompt: string
  images: Array<{ type: string; media_type?: string; data?: string; url?: string }>
}): Promise<{ content: Array<{ type: string; text?: string }> }> {
  return req('/messages/vision', { method: 'POST', body: JSON.stringify(params) })
}

// ── Token counting ───────────────────────────────────────────────────────────

export async function countTokens(params: {
  model: string
  messages: Array<{ role: string; content: string }>
  system?: string
}): Promise<{ input_tokens: number }> {
  return req('/tokens/count', { method: 'POST', body: JSON.stringify(params) })
}

// ── Models ───────────────────────────────────────────────────────────────────

export async function listModels(): Promise<{
  models: Array<{ id: string; display_name: string }>
}> {
  return req('/models')
}
