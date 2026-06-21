'use client'

import { useRef, useEffect } from 'react'
import { Send, Square, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImagePreview } from './ImagePreview'
import type { ImageAttachment } from '@/types/chat'

interface MessageInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
  onAttachImage: () => void
  onRemoveImage: () => void
  pendingImage: ImageAttachment | null
  isStreaming: boolean
  disabled: boolean
  inputTokens: number
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onStop,
  onAttachImage,
  onRemoveImage,
  pendingImage,
  isStreaming,
  disabled,
  inputTokens,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {pendingImage && (
        <ImagePreview image={pendingImage} onRemove={onRemoveImage} />
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAttachImage}
          disabled={isStreaming}
          className="shrink-0 mb-0.5 text-muted-foreground hover:text-foreground"
          title="Attach image"
        >
          <Paperclip size={18} />
        </Button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message Claude… (Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[36px] leading-6 py-1.5"
        />

        <div className="flex items-center gap-2 shrink-0 mb-0.5">
          {inputTokens > 0 && !isStreaming && (
            <span className="text-xs text-muted-foreground">~{inputTokens.toLocaleString()} tokens</span>
          )}
          {isStreaming ? (
            <Button size="icon" variant="ghost" onClick={onStop} title="Stop">
              <Square size={16} className="fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={onSend}
              disabled={!value.trim() && !pendingImage}
              title="Send"
            >
              <Send size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
