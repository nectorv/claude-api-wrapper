'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  loadConversations,
  saveConversations,
  newConversation,
  deriveTitle,
  type StoredConversation,
  type StoredMessage,
} from '@/lib/storage'

export function useLocalConversations() {
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const list = loadConversations()
    setConversations(list)
    if (list.length > 0) setActiveId(list[0].id)
  }, [])

  const active = conversations.find((c) => c.id === activeId) ?? null

  const persist = useCallback((list: StoredConversation[]) => {
    setConversations(list)
    saveConversations(list)
  }, [])

  const createConversation = useCallback(
    (config: { model: string; systemPrompt: string; thinkingEnabled: boolean }) => {
      const conv = newConversation(config)
      const updated = [conv, ...conversations]
      persist(updated)
      setActiveId(conv.id)
      return conv
    },
    [conversations, persist]
  )

  const deleteConversation = useCallback(
    (id: string) => {
      const updated = conversations.filter((c) => c.id !== id)
      persist(updated)
      if (activeId === id) setActiveId(updated[0]?.id ?? null)
    },
    [conversations, activeId, persist]
  )

  const appendMessage = useCallback(
    (convId: string, msg: StoredMessage) => {
      const updated = conversations.map((c) => {
        if (c.id !== convId) return c
        const messages = [...c.messages, msg]
        const title =
          c.messages.length === 0 && msg.role === 'user'
            ? deriveTitle(msg.content)
            : c.title
        return {
          ...c,
          messages,
          title,
          updatedAt: new Date().toISOString(),
        }
      })
      persist(updated)
    },
    [conversations, persist]
  )

  const updateLastAssistant = useCallback(
    (convId: string, patch: Partial<StoredMessage>) => {
      const updated = conversations.map((c) => {
        if (c.id !== convId) return c
        const messages = [...c.messages]
        const lastIdx = messages.findLastIndex((m) => m.role === 'assistant')
        if (lastIdx === -1) return c
        messages[lastIdx] = { ...messages[lastIdx], ...patch }
        return { ...c, messages, updatedAt: new Date().toISOString() }
      })
      persist(updated)
    },
    [conversations, persist]
  )

  const addTokens = useCallback(
    (convId: string, tokens: number) => {
      const updated = conversations.map((c) =>
        c.id === convId ? { ...c, totalTokens: c.totalTokens + tokens } : c
      )
      persist(updated)
    },
    [conversations, persist]
  )

  const compactConversation = useCallback(
    (convId: string, summary: string) => {
      const updated = conversations.map((c) => {
        if (c.id !== convId) return c
        return {
          ...c,
          messages: [
            {
              id: crypto.randomUUID(),
              role: 'user' as const,
              content: `[Conversation summary]\n${summary}`,
              timestamp: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              role: 'assistant' as const,
              content: 'Understood. I have context from the summary above.',
              timestamp: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        }
      })
      persist(updated)
    },
    [conversations, persist]
  )

  return {
    conversations,
    active,
    activeId,
    setActiveId,
    createConversation,
    deleteConversation,
    appendMessage,
    updateLastAssistant,
    addTokens,
    compactConversation,
  }
}
