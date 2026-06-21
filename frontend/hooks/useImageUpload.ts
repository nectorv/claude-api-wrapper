'use client'

import { useCallback, useState } from 'react'
import type { ImageAttachment } from '@/types/chat'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip "data:<type>;base64," prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useImageUpload() {
  const [isDragOver, setIsDragOver] = useState(false)

  const processFile = useCallback(async (file: File): Promise<ImageAttachment | null> => {
    if (!file.type.startsWith('image/')) return null
    const base64 = await fileToBase64(file)
    const previewUrl = URL.createObjectURL(file)
    return {
      base64,
      mediaType: file.type as ImageAttachment['mediaType'],
      previewUrl,
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, onAttach: (img: ImageAttachment) => void) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const img = await processFile(file)
      if (img) onAttach(img)
    },
    [processFile]
  )

  const openFilePicker = useCallback(
    (onAttach: (img: ImageAttachment) => void) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const img = await processFile(file)
        if (img) onAttach(img)
      }
      input.click()
    },
    [processFile]
  )

  return { isDragOver, handleDragOver, handleDragLeave, handleDrop, openFilePicker }
}
