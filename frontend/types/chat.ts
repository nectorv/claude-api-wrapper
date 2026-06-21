export type Role = 'user' | 'assistant'
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error'

export interface ImageAttachment {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  previewUrl: string
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  thinkingContent?: string
  status: MessageStatus
  imageAttachment?: ImageAttachment
  timestamp: Date
}

export interface ModelInfo {
  id: string
  display_name: string
}
