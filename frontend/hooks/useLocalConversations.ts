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

  // Use functional setConversations so callbacks never close over stale state
  const createConversation = useCallback(
    (config: { model: string; systemPrompt: string; thinkingEnabled: boolean }) => {
      const conv = newConversation(config)
      setConversations((prev) => {
        const updated = [conv, ...prev]
        saveConversations(updated)
        return updated
      })
      setActiveId(conv.id)
      return conv
    },
    []
  )

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      saveConversations(updated)
      return updated
    })
    setActiveId((prev) => (prev === id ? null : prev))
  }, [])

  const appendMessage = useCallback((convId: string, msg: StoredMessage) => {
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== convId) return c
        const messages = [...c.messages, msg]
        const title =
          c.messages.length === 0 && msg.role === 'user'
            ? deriveTitle(msg.content)
            : c.title
        return { ...c, messages, title, updatedAt: new Date().toISOString() }
      })
      saveConversations(updated)
      return updated
    })
  }, [])

  const updateLastAssistant = useCallback(
    (convId: string, patch: Partial<StoredMessage>) => {
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== convId) return c
          const messages = [...c.messages]
          const lastIdx = messages.findLastIndex((m) => m.role === 'assistant')
          if (lastIdx === -1) return c
          messages[lastIdx] = { ...messages[lastIdx], ...patch }
          return { ...c, messages, updatedAt: new Date().toISOString() }
        })
        saveConversations(updated)
        return updated
      })
    },
    []
  )

  const addTokens = useCallback((convId: string, tokens: number) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === convId ? { ...c, totalTokens: c.totalTokens + tokens } : c
      )
      saveConversations(updated)
      return updated
    })
  }, [])

  const compactConversation = useCallback((convId: string, summary: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => {
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
      saveConversations(updated)
      return updated
    })
  }, [])

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
