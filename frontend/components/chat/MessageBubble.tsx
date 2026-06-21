'use client'

import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { ThinkingBlock } from './ThinkingBlock'
import { StreamingDots } from './StreamingDots'
import type { ChatMessage } from '@/types/chat'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: ChatMessage
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-background/80 hover:bg-background border border-border"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-muted-foreground" />}
    </button>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {message.imageAttachment && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.imageAttachment.previewUrl}
              alt="Attached"
              className="mb-2 rounded-lg max-h-40 object-cover"
            />
          )}
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] min-w-0">
        {message.thinkingContent && (
          <ThinkingBlock content={message.thinkingContent} />
        )}

        <div
          className={cn(
            'rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm',
            message.status === 'error'
              ? 'bg-destructive/10 text-destructive border border-destructive/20'
              : 'bg-muted'
          )}
        >
          {message.status === 'streaming' && !message.content ? (
            <StreamingDots />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: ({ children }) => {
                    const codeEl = children as React.ReactElement<{ children?: string }>
                    return (
                      <div className="relative group not-prose">
                        <pre className="overflow-x-auto rounded-lg bg-zinc-950 dark:bg-zinc-900 p-3 text-xs my-2">
                          {children}
                        </pre>
                        <CopyButton text={codeEl?.props?.children ?? ''} />
                      </div>
                    )
                  },
                  code: ({ className, children, ...rest }) => {
                    const isBlock = className?.includes('language-')
                    if (isBlock) {
                      return <code className={className} {...rest}>{children}</code>
                    }
                    return (
                      <code className="bg-muted-foreground/10 rounded px-1 py-0.5 text-xs font-mono" {...rest}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content || (message.status === 'streaming' ? '▋' : '')}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
