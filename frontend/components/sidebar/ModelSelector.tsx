'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MODELS } from '@/lib/models'

interface ModelSelectorProps {
  value: string
  onChange: (model: string) => void
  lockedInSession: boolean
}

type SelectChangeHandler = (value: string | null, ...rest: unknown[]) => void

export function ModelSelector({ value, onChange, lockedInSession }: ModelSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Model</label>
      <Select value={value} onValueChange={((v) => v && onChange(v)) as SelectChangeHandler}>
        <SelectTrigger className="w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id} className="text-sm">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {lockedInSession && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Model change applies to next new conversation
        </p>
      )}
    </div>
  )
}
