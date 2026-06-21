'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ThinkingBlockProps {
  content: string
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <Brain size={13} />
        <span>Thinking</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md bg-muted/50 border border-border/50 p-3 text-xs text-muted-foreground italic whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
