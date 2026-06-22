import { describe, it, expect } from 'vitest'
import { mergeModels } from '@/lib/opencode/models'

describe('mergeModels', () => {
  it('tags free models with all-zero pricing as free', () => {
    const out = mergeModels(
      [{ id: 'free-1', pricing: { input: 0, output: 0 } }],
      [],
    )
    expect(out[0].category).toBe('free')
  })

  it('tags paid Zen models as zen', () => {
    const out = mergeModels(
      [{ id: 'paid-1', pricing: { input: 1, output: 2 } }],
      [],
    )
    expect(out[0].category).toBe('zen')
  })

  it('promotes models that are also in the Go list to go (unless they are free)', () => {
    const out = mergeModels(
      [{ id: 'shared', pricing: { input: 1, output: 2 } }],
      [{ id: 'shared', pricing: { input: 1, output: 2 } }],
    )
    expect(out[0].category).toBe('go')
  })

  it('keeps free models free even if they are in the Go list', () => {
    const out = mergeModels(
      [{ id: 'shared-free', pricing: { input: 0, output: 0 } }],
      [{ id: 'shared-free', pricing: { input: 0, output: 0 } }],
    )
    expect(out[0].category).toBe('free')
  })

  it('includes Go-only models', () => {
    const out = mergeModels(
      [],
      [{ id: 'go-only', pricing: { input: 1, output: 2 } }],
    )
    expect(out[0].category).toBe('go')
  })
})
