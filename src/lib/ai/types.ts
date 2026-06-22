import type { UIMessage } from 'ai'

export type ChatUIMessage = UIMessage<{
  model?: string
  totalTokens?: number
  inputTokens?: number
  outputTokens?: number
  cachedTokens?: number
  durationMs?: number
}>
