'use client'

import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StoredConversation } from '@/lib/storage'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  conversations: StoredConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button onClick={onNew} className="w-full gap-2" size="sm">
          <Plus size={14} />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-muted-foreground gap-2">
            <MessageSquare size={20} className="opacity-40" />
            <span>No conversations yet</span>
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              'group relative flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors',
              activeId === conv.id && 'bg-muted'
            )}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate leading-snug">{conv.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(conv.updatedAt)} · {conv.messages.length} msgs
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
