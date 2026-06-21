export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinkingContent?: string
  imagePreviewUrl?: string
  timestamp: string
}

export interface StoredConversation {
  id: string
  title: string
  model: string
  systemPrompt: string
  thinkingEnabled: boolean
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
  totalTokens: number
}

const KEY = 'claude_conversations'

export function loadConversations(): StoredConversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredConversation[]) : []
  } catch {
    return []
  }
}

export function saveConversations(list: StoredConversation[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function newConversation(config: {
  model: string
  systemPrompt: string
  thinkingEnabled: boolean
}): StoredConversation {
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    model: config.model,
    systemPrompt: config.systemPrompt,
    thinkingEnabled: config.thinkingEnabled,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalTokens: 0,
  }
}

export function deriveTitle(firstUserMessage: string): string {
  return firstUserMessage.length > 60
    ? firstUserMessage.slice(0, 57) + '…'
    : firstUserMessage
}
