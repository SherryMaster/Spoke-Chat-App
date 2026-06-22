import { describe, it, expect } from 'vitest'
import { getOpenCodeModel } from '@/lib/opencode/provider'

describe('getOpenCodeModel', () => {
  it('routes claude-* to a model that has a modelId', () => {
    const m = getOpenCodeModel('claude-sonnet-4-6', 'sk-test', {
      id: 'claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      endpoint: 'https://opencode.ai/zen/v1/messages',
      category: 'zen',
      pricing: null,
      supportsImages: false,
      contextWindow: null,
    })
    expect(typeof (m as any).doGenerate).toBe('function')
    expect(typeof (m as any).doStream).toBe('function')
  })

  it('routes gpt-* to a model that has doGenerate', () => {
    const m = getOpenCodeModel('gpt-5.4', 'sk-test', {
      id: 'gpt-5.4',
      name: 'GPT 5.4',
      endpoint: 'https://opencode.ai/zen/v1/responses',
      category: 'zen',
      pricing: null,
      supportsImages: false,
      contextWindow: null,
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })

  it('routes all others via openai-compatible provider', () => {
    const m = getOpenCodeModel('minimax-m3', 'sk-test', {
      id: 'minimax-m3',
      name: 'MiniMax M3',
      endpoint: 'https://opencode.ai/zen/v1/chat/completions',
      category: 'zen',
      pricing: null,
      supportsImages: false,
      contextWindow: null,
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })
})
