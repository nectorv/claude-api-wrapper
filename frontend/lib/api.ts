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

// ── Stateless streaming (no server-side session) ──────────────────────────────

export async function streamMessages(params: {
  model: string
  messages: Array<{ role: string; content: string | unknown[] }>
  system?: string
  thinking?: { type: 'adaptive' } | { type: 'disabled' }
  max_tokens?: number
}, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`${BASE}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_tokens: 8096, stream: true, ...params }),
    signal,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res
}

// ── Summarise for compaction (stateless) ─────────────────────────────────────

export async function summarise(params: {
  model: string
  history: Array<{ role: string; content: string }>
}): Promise<string> {
  const body = {
    model: params.model,
    messages: [
      {
        role: 'user',
        content:
          'Summarize this conversation concisely, preserving all key facts, decisions, and context.\n\n' +
          '<conversation>\n' +
          JSON.stringify(params.history, null, 2) +
          '\n</conversation>',
      },
    ],
    max_tokens: 2048,
  }
  const data: { content: Array<{ type: string; text?: string }> } = await req('/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data.content.find((b) => b.type === 'text')?.text ?? ''
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
