'use client'

import { Plus, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { compactConversation } from '@/lib/api'

interface ConversationControlsProps {
  conversationId: string | null
  onNew: () => void
  onClear: () => void
}

export function ConversationControls({ conversationId, onNew, onClear }: ConversationControlsProps) {
  const [compactOpen, setCompactOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCompact = async () => {
    if (!conversationId) return
    setLoading(true)
    try {
      const res = await compactConversation(conversationId)
      setSummary(res.summary)
      setCompactOpen(true)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversation</p>
        <div className="grid grid-cols-3 gap-1.5">
          <Button variant="outline" size="sm" onClick={onNew} className="flex-col h-auto py-2 gap-1">
            <Plus size={14} />
            <span className="text-xs">New</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onClear} className="flex-col h-auto py-2 gap-1">
            <Trash2 size={14} />
            <span className="text-xs">Clear</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompact}
            disabled={!conversationId || loading}
            className="flex-col h-auto py-2 gap-1"
          >
            <Zap size={14} />
            <span className="text-xs">{loading ? '…' : 'Compact'}</span>
          </Button>
        </div>
      </div>

      <Dialog open={compactOpen} onOpenChange={setCompactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conversation compacted</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            History replaced with this summary:
          </p>
          <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {summary}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
