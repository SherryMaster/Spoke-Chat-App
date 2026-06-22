import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { OpenCodeModel } from './models'

const ZEN_BASE = 'https://opencode.ai/zen/v1'

function isAnthropicModel(id: string) {
  return id.startsWith('claude-')
}
function isOpenAIModel(id: string) {
  return /^(gpt-|o[1-9]-)/.test(id)
}
function isGoogleModel(id: string) {
  return id.startsWith('gemini-')
}

export function getOpenCodeModel(modelId: string, apiKey: string, meta: OpenCodeModel) {
  if (isAnthropicModel(modelId)) {
    const provider = createAnthropic({ apiKey, baseURL: ZEN_BASE })
    return provider(modelId.replace(/^claude-/, ''))
  }

  if (isOpenAIModel(modelId)) {
    const provider = createOpenAICompatible({
      name: 'opencode-zen-openai',
      apiKey,
      baseURL: `${ZEN_BASE}/responses`,
    })
    return provider(modelId)
  }

  if (isGoogleModel(modelId)) {
    const provider = createOpenAICompatible({
      name: 'opencode-zen-google',
      apiKey,
      baseURL: `${ZEN_BASE}/chat/completions`,
    })
    return provider(modelId)
  }

  // Default: OpenAI-compatible against /chat/completions
  const provider = createOpenAICompatible({
    name: 'opencode-zen-compat',
    apiKey,
    baseURL: `${ZEN_BASE}/chat/completions`,
  })
  return provider(modelId)
}
