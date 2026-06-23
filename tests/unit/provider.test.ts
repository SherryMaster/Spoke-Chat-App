import { describe, it, expect } from 'vitest'
import { getOpenCodeModel } from '@/lib/opencode/provider'

const baseMeta = {
  name: 'Test',
  category: 'zen' as const,
  pricing: null,
  supportsImages: false,
  contextWindow: null,
}

describe('getOpenCodeModel', () => {
  it('routes Zen claude-* to Anthropic at /zen/v1', () => {
    const m = getOpenCodeModel('claude-sonnet-4-6', 'sk-test', {
      ...baseMeta,
      id: 'claude-sonnet-4-6',
      endpoint: 'https://opencode.ai/zen/v1/messages',
    })
    expect(typeof (m as any).doGenerate).toBe('function')
    expect(typeof (m as any).doStream).toBe('function')
  })

  it('routes Go minimax-* (Anthropic protocol) to Anthropic at /zen/go/v1', () => {
    const m = getOpenCodeModel('minimax-m3', 'sk-test', {
      ...baseMeta,
      id: 'minimax-m3',
      endpoint: 'https://opencode.ai/zen/go/v1/messages',
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })

  it('routes Go qwen3.*-max/plus (Anthropic protocol) to Anthropic at /zen/go/v1', () => {
    const m = getOpenCodeModel('qwen3.7-max', 'sk-test', {
      ...baseMeta,
      id: 'qwen3.7-max',
      endpoint: 'https://opencode.ai/zen/go/v1/messages',
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })

  it('routes gpt-* to OpenAI-compatible at /zen/v1', () => {
    const m = getOpenCodeModel('gpt-5.4', 'sk-test', {
      ...baseMeta,
      id: 'gpt-5.4',
      endpoint: 'https://opencode.ai/zen/v1/responses',
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })

  it('routes Zen chat/completions models to OpenAI-compatible at /zen/v1', () => {
    const m = getOpenCodeModel('big-pickle', 'sk-test', {
      ...baseMeta,
      id: 'big-pickle',
      endpoint: 'https://opencode.ai/zen/v1/chat/completions',
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })

  it('routes Go chat/completions models to OpenAI-compatible at /zen/go/v1', () => {
    const m = getOpenCodeModel('deepseek-v4-pro', 'sk-test', {
      ...baseMeta,
      id: 'deepseek-v4-pro',
      endpoint: 'https://opencode.ai/zen/go/v1/chat/completions',
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })

  it('routes gemini-* to Google Generative AI at /zen/v1', () => {
    const m = getOpenCodeModel('gemini-3.5-flash', 'sk-test', {
      ...baseMeta,
      id: 'gemini-3.5-flash',
      endpoint: 'https://opencode.ai/zen/v1/models/gemini-3.5-flash',
    })
    expect(typeof (m as any).doGenerate).toBe('function')
  })

  it('throws on unrecognized endpoint shape', () => {
    expect(() =>
      getOpenCodeModel('mystery', 'sk-test', {
        ...baseMeta,
        id: 'mystery',
        endpoint: 'https://opencode.ai/zen/v1/something-else',
      }),
    ).toThrow(/Unsupported OpenCode endpoint/)
  })
})
