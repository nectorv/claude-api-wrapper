'use client'

import { useState, useEffect, useRef } from 'react'
import { countTokens } from '@/lib/api'

export function useTokenCount(
  model: string,
  messages: Array<{ role: string; content: string }>,
  inputText: string,
  systemPrompt: string,
  disabled: boolean
) {
  const [inputTokens, setInputTokens] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (disabled || !inputText.trim()) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const allMessages = [...messages, { role: 'user', content: inputText }]
        const res = await countTokens({
          model,
          messages: allMessages,
          system: systemPrompt || undefined,
        })
        setInputTokens(res.input_tokens)
      } catch {
        // ignore errors silently
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [model, inputText, systemPrompt, disabled, messages])

  return inputTokens
}
