'use client'

import { X } from 'lucide-react'
import type { ImageAttachment } from '@/types/chat'

interface ImagePreviewProps {
  image: ImageAttachment
  onRemove: () => void
}

export function ImagePreview({ image, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative inline-block mb-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.previewUrl}
        alt="Attachment"
        className="h-20 w-20 rounded-lg object-cover border border-border"
      />
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        <X size={12} />
      </button>
      <p className="text-xs text-muted-foreground mt-1 text-center">Vision only</p>
    </div>
  )
}
