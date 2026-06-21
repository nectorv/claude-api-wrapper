'use client'

import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useSSEStream } from '@/hooks/useSSEStream'
import { useConversation } from '@/hooks/useConversation'
import { useTokenCount } from '@/hooks/useTokenCount'
import { useImageUpload } from '@/hooks/useImageUpload'
import { analyzeImage } from '@/lib/api'
import { DEFAULT_MODEL } from '@/lib/models'
import type { ChatMessage, ImageAttachment } from '@/types/chat'

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [totalTokens, setTotalTokens] = useState(0)
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null)

  const { stream, abort } = useSSEStream()
  const { ensureSession, clearSession, getId } = useConversation()
  const { handleDragOver, handleDragLeave, handleDrop, openFilePicker } = useImageUpload()

  const sessionMessages = messages.map((m) => ({ role: m.role, content: m.content }))
  const inputTokens = useTokenCount(model, sessionMessages, input, systemPrompt, isStreaming)

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
    return msg.id
  }, [])

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text && !pendingImage) return
    if (isStreaming) return

    setInput('')
    const userMsgId = nanoid()

    // 1. Add user message
    addMessage({
      id: userMsgId,
      role: 'user',
      content: text,
      imageAttachment: pendingImage ?? undefined,
      status: 'done',
      timestamp: new Date(),
    })
    const img = pendingImage
    setPendingImage(null)

    // 2. Add placeholder assistant message
    const asstMsgId = nanoid()
    addMessage({
      id: asstMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: new Date(),
    })
    setIsStreaming(true)

    try {
      // 3a. Vision path — image attached
      if (img) {
        const res = await analyzeImage({
          model,
          prompt: text || 'Describe this image.',
          images: [{ type: 'base64', media_type: img.mediaType, data: img.base64 }],
        })
        const answer = res.content?.find((b) => b.type === 'text')?.text ?? '(no response)'
        updateMessage(asstMsgId, { content: answer, status: 'done' })
        setIsStreaming(false)
        return
      }

      // 3b. Streaming conversation path
      const convId = await ensureSession({ model, system: systemPrompt, thinkingEnabled })

      await stream(convId, text, {
        onTextDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId ? { ...m, content: m.content + delta } : m
            )
          )
        },
        onThinkingDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId
                ? { ...m, thinkingContent: (m.thinkingContent ?? '') + delta }
                : m
            )
          )
        },
        onComplete: (tokens) => {
          setTotalTokens((prev) => prev + tokens)
          updateMessage(asstMsgId, { status: 'done' })
          setIsStreaming(false)
        },
        onError: (err) => {
          updateMessage(asstMsgId, {
            content: `Error: ${err.message}`,
            status: 'error',
          })
          setIsStreaming(false)
        },
      })
    } catch (err) {
      updateMessage(asstMsgId, {
        content: `Error: ${(err as Error).message}`,
        status: 'error',
      })
      setIsStreaming(false)
    }
  }, [input, pendingImage, isStreaming, model, systemPrompt, thinkingEnabled, addMessage, updateMessage, stream, ensureSession])

  const handleStop = useCallback(() => {
    abort()
    setMessages((prev) =>
      prev.map((m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m))
    )
    setIsStreaming(false)
  }, [abort])

  const handleNew = useCallback(async () => {
    await clearSession()
    setMessages([])
    setInput('')
    setPendingImage(null)
    setTotalTokens(0)
    setIsStreaming(false)
  }, [clearSession])

  const handleClear = useCallback(async () => {
    await clearSession()
    setMessages([])
    setInput('')
    setPendingImage(null)
    setTotalTokens(0)
    setIsStreaming(false)
  }, [clearSession])

  return (
    <div
      className="flex h-screen bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, setPendingImage)}
    >
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:flex">
        <Sidebar
          model={model}
          onModelChange={setModel}
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
          thinkingEnabled={thinkingEnabled}
          onThinkingChange={setThinkingEnabled}
          conversationId={getId()}
          onNew={handleNew}
          onClear={handleClear}
          totalTokens={totalTokens}
        />
      </div>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Claude</span>
          <span className="text-xs text-muted-foreground">{model.split('-').slice(1).join('-')}</span>
        </header>

        <MessageList messages={messages} />

        <MessageInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          onAttachImage={() => openFilePicker(setPendingImage)}
          onRemoveImage={() => {
            if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
            setPendingImage(null)
          }}
          pendingImage={pendingImage}
          isStreaming={isStreaming}
          disabled={false}
          inputTokens={inputTokens}
        />
      </div>
    </div>
  )
}
