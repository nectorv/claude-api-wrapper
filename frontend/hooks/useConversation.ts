'use client'

import { useRef, useCallback } from 'react'
import { createConversation, deleteConversation } from '@/lib/api'

interface ConversationConfig {
  model: string
  system?: string
  thinkingEnabled: boolean
}

export function useConversation() {
  const idRef = useRef<string | null>(null)

  const ensureSession = useCallback(async (config: ConversationConfig): Promise<string> => {
    if (idRef.current) return idRef.current

    const res = await createConversation({
      model: config.model,
      system: config.system || undefined,
      thinking: config.thinkingEnabled ? { type: 'adaptive' } : { type: 'disabled' },
    })
    idRef.current = res.conversation_id
    return res.conversation_id
  }, [])

  const clearSession = useCallback(async () => {
    if (idRef.current) {
      await deleteConversation(idRef.current).catch(() => {})
      idRef.current = null
    }
  }, [])

  const getId = useCallback(() => idRef.current, [])

  return { ensureSession, clearSession, getId }
}
