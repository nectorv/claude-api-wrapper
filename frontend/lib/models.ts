export interface ModelOption {
  id: string
  label: string
  supportsThinking: boolean
}

export const MODELS: ModelOption[] = [
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 · fastest', supportsThinking: false },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 · balanced', supportsThinking: false },
  { id: 'claude-opus-4-8', label: 'Opus 4.8 · powerful', supportsThinking: true },
  { id: 'claude-fable-5', label: 'Fable 5 · most capable', supportsThinking: true },
]

export const DEFAULT_MODEL = 'claude-sonnet-4-6'
