'use client'

import { Switch } from '@/components/ui/switch'
import { Brain } from 'lucide-react'
import { MODELS } from '@/lib/models'

interface ThinkingToggleProps {
  enabled: boolean
  onChange: (v: boolean) => void
  model: string
  lockedInSession: boolean
}

export function ThinkingToggle({ enabled, onChange, model, lockedInSession }: ThinkingToggleProps) {
  const modelConfig = MODELS.find((m) => m.id === model)
  const supported = modelConfig?.supportsThinking ?? false

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Brain size={14} className="text-muted-foreground" />
        <span className="text-sm">Thinking mode</span>
      </div>
      <Switch
        checked={enabled && supported}
        onCheckedChange={onChange}
        disabled={!supported || lockedInSession}
        title={!supported ? `${model} doesn't support thinking` : undefined}
      />
    </div>
  )
}
