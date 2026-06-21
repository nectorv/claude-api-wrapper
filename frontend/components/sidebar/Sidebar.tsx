'use client'

import { useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Zap } from 'lucide-react'
import { ModelSelector } from './ModelSelector'
import { SystemPrompt } from './SystemPrompt'
import { ThinkingToggle } from './ThinkingToggle'

interface SidebarProps {
  model: string
  onModelChange: (m: string) => void
  systemPrompt: string
  onSystemPromptChange: (s: string) => void
  thinkingEnabled: boolean
  onThinkingChange: (v: boolean) => void
  totalTokens: number
  onCompact: () => Promise<string>
  hasConversation: boolean
  isStreaming: boolean
}

export function Sidebar({
  model,
  onModelChange,
  systemPrompt,
  onSystemPromptChange,
  thinkingEnabled,
  onThinkingChange,
  totalTokens,
  onCompact,
  hasConversation,
  isStreaming,
}: SidebarProps) {
  const [compactOpen, setCompactOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCompact = async () => {
    setLoading(true)
    const result = await onCompact()
    setLoading(false)
    if (result) {
      setSummary(result)
      setCompactOpen(true)
    }
  }

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-muted/20 flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-5 flex-1">
        <ModelSelector value={model} onChange={onModelChange} lockedInSession={false} />

        <Separator />

        <ThinkingToggle
          enabled={thinkingEnabled}
          onChange={onThinkingChange}
          model={model}
          lockedInSession={false}
        />

        <Separator />

        <SystemPrompt
          value={systemPrompt}
          onChange={onSystemPromptChange}
          lockedInSession={false}
        />

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={handleCompact}
          disabled={!hasConversation || isStreaming || loading}
        >
          <Zap size={14} />
          {loading ? 'Compacting…' : 'Compact history'}
        </Button>
      </div>

      {totalTokens > 0 && (
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          Total tokens: {totalTokens.toLocaleString()}
        </div>
      )}

      <Dialog open={compactOpen} onOpenChange={setCompactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conversation compacted</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">History replaced with summary:</p>
          <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {summary}
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
