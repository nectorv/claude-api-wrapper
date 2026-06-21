'use client'

import { Separator } from '@/components/ui/separator'
import { ModelSelector } from './ModelSelector'
import { SystemPrompt } from './SystemPrompt'
import { ThinkingToggle } from './ThinkingToggle'
import { ConversationControls } from './ConversationControls'

interface SidebarProps {
  model: string
  onModelChange: (m: string) => void
  systemPrompt: string
  onSystemPromptChange: (s: string) => void
  thinkingEnabled: boolean
  onThinkingChange: (v: boolean) => void
  conversationId: string | null
  onNew: () => void
  onClear: () => void
  totalTokens: number
}

export function Sidebar({
  model,
  onModelChange,
  systemPrompt,
  onSystemPromptChange,
  thinkingEnabled,
  onThinkingChange,
  conversationId,
  onNew,
  onClear,
  totalTokens,
}: SidebarProps) {
  const locked = conversationId !== null

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-muted/30 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h1 className="font-semibold text-sm">Claude</h1>
        <p className="text-xs text-muted-foreground">API Wrapper</p>
      </div>

      <div className="p-4 space-y-5 flex-1">
        <ModelSelector value={model} onChange={onModelChange} lockedInSession={locked} />

        <Separator />

        <ThinkingToggle
          enabled={thinkingEnabled}
          onChange={onThinkingChange}
          model={model}
          lockedInSession={locked}
        />

        <Separator />

        <SystemPrompt value={systemPrompt} onChange={onSystemPromptChange} lockedInSession={locked} />

        <Separator />

        <ConversationControls
          conversationId={conversationId}
          onNew={onNew}
          onClear={onClear}
        />
      </div>

      {totalTokens > 0 && (
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          Total tokens used: {totalTokens.toLocaleString()}
        </div>
      )}
    </aside>
  )
}
