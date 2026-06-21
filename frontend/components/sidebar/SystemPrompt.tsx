'use client'

import { Textarea } from '@/components/ui/textarea'

interface SystemPromptProps {
  value: string
  onChange: (v: string) => void
  lockedInSession: boolean
}

export function SystemPrompt({ value, onChange, lockedInSession }: SystemPromptProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Prompt</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="You are a helpful assistant…"
        disabled={lockedInSession}
        className="text-sm min-h-[100px] resize-none"
      />
      {lockedInSession && (
        <p className="text-xs text-muted-foreground">
          Set before starting a new conversation
        </p>
      )}
    </div>
  )
}
