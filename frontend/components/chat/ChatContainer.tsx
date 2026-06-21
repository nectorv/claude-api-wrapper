'use client'

import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ConversationList } from '@/components/conversations/ConversationList'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useSSEStream } from '@/hooks/useSSEStream'
import { useLocalConversations } from '@/hooks/useLocalConversations'
import { useTokenCount } from '@/hooks/useTokenCount'
import { useImageUpload } from '@/hooks/useImageUpload'
import { analyzeImage, summarise } from '@/lib/api'
import { DEFAULT_MODEL } from '@/lib/models'
import type { ChatMessage, ImageAttachment } from '@/types/chat'

export function ChatContainer() {
  // UI-only state (not persisted — transient per-session display state)
  const [uiMessages, setUiMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null)

  // Default settings for new conversations
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL)
  const [defaultSystem, setDefaultSystem] = useState('')
  const [defaultThinking, setDefaultThinking] = useState(false)

  const { stream, abort } = useSSEStream()
  const { handleDragOver, handleDragLeave, handleDrop, openFilePicker } = useImageUpload()

  const {
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
  } = useLocalConversations()

  // Sync UI messages when switching conversations
  const switchTo = useCallback(
    (id: string) => {
      setActiveId(id)
      const conv = conversations.find((c) => c.id === id)
      if (!conv) return
      setUiMessages(
        conv.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          thinkingContent: m.thinkingContent,
          status: 'done' as const,
          imageAttachment: m.imagePreviewUrl
            ? ({ previewUrl: m.imagePreviewUrl } as ImageAttachment)
            : undefined,
          timestamp: new Date(m.timestamp),
        }))
      )
      setInput('')
      setPendingImage(null)
    },
    [conversations, setActiveId]
  )

  const handleNew = useCallback(() => {
    const conv = createConversation({
      model: defaultModel,
      systemPrompt: defaultSystem,
      thinkingEnabled: defaultThinking,
    })
    setUiMessages([])
    setInput('')
    setPendingImage(null)
    setActiveId(conv.id)
  }, [createConversation, defaultModel, defaultSystem, defaultThinking, setActiveId])

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation(id)
      if (id === activeId) {
        setUiMessages([])
        setInput('')
      }
    },
    [deleteConversation, activeId]
  )

  const sessionMessages = (active?.messages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const currentModel = active?.model ?? defaultModel
  const currentSystem = active?.systemPrompt ?? defaultSystem

  const inputTokens = useTokenCount(
    currentModel,
    sessionMessages,
    input,
    currentSystem,
    isStreaming
  )

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text && !pendingImage) return
    if (isStreaming) return

    // Ensure we have an active conversation
    let convId = activeId
    let conv = active
    if (!convId || !conv) {
      conv = createConversation({
        model: defaultModel,
        systemPrompt: defaultSystem,
        thinkingEnabled: defaultThinking,
      })
      convId = conv.id
      setActiveId(conv.id)
      setUiMessages([])
    }

    setInput('')
    const img = pendingImage
    setPendingImage(null)

    const userMsgId = nanoid()
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      imageAttachment: img ?? undefined,
      status: 'done',
      timestamp: new Date(),
    }
    setUiMessages((prev) => [...prev, userMsg])
    appendMessage(convId, {
      id: userMsgId,
      role: 'user',
      content: text,
      imagePreviewUrl: img?.previewUrl,
      timestamp: new Date().toISOString(),
    })

    const asstMsgId = nanoid()
    const asstPlaceholder: ChatMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: new Date(),
    }
    setUiMessages((prev) => [...prev, asstPlaceholder])
    setIsStreaming(true)

    try {
      // Vision path
      if (img) {
        const res = await analyzeImage({
          model: conv.model,
          prompt: text || 'Describe this image.',
          images: [{ type: 'base64', media_type: img.mediaType, data: img.base64 }],
        })
        const answer = res.content?.find((b) => b.type === 'text')?.text ?? '(no response)'
        setUiMessages((prev) =>
          prev.map((m) => (m.id === asstMsgId ? { ...m, content: answer, status: 'done' } : m))
        )
        appendMessage(convId, {
          id: asstMsgId,
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString(),
        })
        setIsStreaming(false)
        return
      }

      // Streaming path — send full history to stateless endpoint
      const history = [
        ...(conv.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
      ]

      const thinking = conv.thinkingEnabled ? { type: 'adaptive' as const } : undefined

      let accText = ''
      let accThinking = ''

      await stream(
        {
          model: conv.model,
          messages: history,
          system: conv.systemPrompt || undefined,
          thinking,
        },
        {
          onTextDelta: (delta) => {
            accText += delta
            setUiMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId ? { ...m, content: m.content + delta } : m
              )
            )
          },
          onThinkingDelta: (delta) => {
            accThinking += delta
            setUiMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId
                  ? { ...m, thinkingContent: (m.thinkingContent ?? '') + delta }
                  : m
              )
            )
          },
          onComplete: (tokens) => {
            setUiMessages((prev) =>
              prev.map((m) => (m.id === asstMsgId ? { ...m, status: 'done' } : m))
            )
            appendMessage(convId!, {
              id: asstMsgId,
              role: 'assistant',
              content: accText,
              thinkingContent: accThinking || undefined,
              timestamp: new Date().toISOString(),
            })
            addTokens(convId!, tokens)
            setIsStreaming(false)
          },
          onError: (err) => {
            setUiMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsgId
                  ? { ...m, content: `Error: ${err.message}`, status: 'error' }
                  : m
              )
            )
            setIsStreaming(false)
          },
        }
      )
    } catch (err) {
      setUiMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? { ...m, content: `Error: ${(err as Error).message}`, status: 'error' }
            : m
        )
      )
      setIsStreaming(false)
    }
  }, [
    input, pendingImage, isStreaming, activeId, active, defaultModel,
    defaultSystem, defaultThinking, createConversation, setActiveId,
    appendMessage, addTokens, stream, analyzeImage,
  ])

  const handleStop = useCallback(() => {
    abort()
    setUiMessages((prev) =>
      prev.map((m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m))
    )
    setIsStreaming(false)
  }, [abort])

  const handleCompact = useCallback(async () => {
    if (!activeId || !active || active.messages.length < 4) return ''
    try {
      const summary = await summarise({
        model: active.model,
        history: active.messages.map((m) => ({ role: m.role, content: m.content })),
      })
      compactConversation(activeId, summary)
      setUiMessages([
        {
          id: nanoid(),
          role: 'user',
          content: `[Conversation summary]\n${summary}`,
          status: 'done',
          timestamp: new Date(),
        },
        {
          id: nanoid(),
          role: 'assistant',
          content: 'Understood. I have context from the summary above.',
          status: 'done',
          timestamp: new Date(),
        },
      ])
      return summary ?? ''
    } catch {
      return ''
    }
  }, [activeId, active, compactConversation])

  return (
    <div
      className="flex h-screen bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, setPendingImage)}
    >
      {/* Conversation list — hidden on mobile */}
      <div className="hidden md:flex w-64 shrink-0 border-r border-border flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="font-semibold text-sm">Claude</h1>
          <p className="text-xs text-muted-foreground">API Wrapper</p>
        </div>
        <div className="flex-1 min-h-0">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={switchTo}
            onNew={handleNew}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Settings sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          model={active?.model ?? defaultModel}
          onModelChange={(m) => setDefaultModel(m)}
          systemPrompt={active?.systemPrompt ?? defaultSystem}
          onSystemPromptChange={setDefaultSystem}
          thinkingEnabled={active?.thinkingEnabled ?? defaultThinking}
          onThinkingChange={setDefaultThinking}
          totalTokens={active?.totalTokens ?? 0}
          onCompact={handleCompact}
          hasConversation={!!active && active.messages.length > 0}
          isStreaming={isStreaming}
        />
      </div>

      {/* Chat */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Claude</span>
          <span className="text-xs text-muted-foreground">{currentModel.split('-').slice(1).join('-')}</span>
        </header>

        <MessageList messages={uiMessages} />

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
