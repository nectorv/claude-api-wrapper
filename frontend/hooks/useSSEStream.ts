'use client'

import { useCallback, useRef } from 'react'
import { sendStreamingMessage } from '@/lib/api'

interface SSECallbacks {
  onTextDelta: (text: string) => void
  onThinkingDelta: (thinking: string) => void
  onComplete: (totalTokens: number) => void
  onError: (error: Error) => void
}

export function useSSEStream() {
  const abortRef = useRef<AbortController | null>(null)

  const stream = useCallback(
    async (conversationId: string, content: string, callbacks: SSECallbacks) => {
      abortRef.current = new AbortController()

      try {
        const response = await sendStreamingMessage(
          conversationId,
          content,
          abortRef.current.signal
        )

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let currentBlockType: 'text' | 'thinking' | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            for (const line of part.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const payload = line.slice(6).trim()
              if (payload === '[DONE]') return

              try {
                const event = JSON.parse(payload)

                if (event.event_type === 'RawContentBlockStartEvent') {
                  currentBlockType = event.content_block?.type ?? null
                }

                if (event.event_type === 'RawContentBlockDeltaEvent') {
                  const delta = event.delta
                  if (delta?.type === 'text_delta' && currentBlockType === 'text') {
                    callbacks.onTextDelta(delta.text ?? '')
                  }
                  if (delta?.type === 'thinking_delta' && currentBlockType === 'thinking') {
                    callbacks.onThinkingDelta(delta.thinking ?? '')
                  }
                }

                if (event.event_type === 'final_message') {
                  callbacks.onComplete(event.total_tokens ?? 0)
                }
              } catch {
                // skip malformed event
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          callbacks.onError(err as Error)
        }
      }
    },
    []
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { stream, abort }
}
