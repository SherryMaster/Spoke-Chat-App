import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { OpenCodeModel } from './models'

export function getOpenCodeModel(modelId: string, apiKey: string, meta: OpenCodeModel) {
  const url = new URL(meta.endpoint)
  const path = url.pathname.replace(/\/+$/, '')

  if (path.endsWith('/messages')) {
    const provider = createAnthropic({
      apiKey,
      baseURL: `${url.origin}${path.slice(0, -'/messages'.length)}`,
    })
    return provider(modelId)
  }

  if (path.endsWith('/responses')) {
    const provider = createOpenAICompatible({
      name: 'opencode-responses',
      apiKey,
      baseURL: `${url.origin}${path.slice(0, -'/responses'.length)}`,
    })
    return provider(modelId)
  }

  if (path.endsWith('/chat/completions')) {
    const provider = createOpenAICompatible({
      name: 'opencode-chat',
      apiKey,
      baseURL: `${url.origin}${path.slice(0, -'/chat/completions'.length)}`,
    })
    return provider(modelId)
  }

  if (path.includes('/models/')) {
    const provider = createGoogleGenerativeAI({
      apiKey,
      baseURL: `${url.origin}${path.replace(/\/models\/.*$/, '')}`,
    })
    return provider(modelId)
  }

  throw new Error(`Unsupported OpenCode endpoint: ${meta.endpoint}`)
}
