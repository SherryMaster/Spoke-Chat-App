export type ModelCategory = 'free' | 'zen' | 'go'

export interface OpenCodeModel {
  id: string
  name: string
  endpoint: string
  category: ModelCategory
  pricing: { input: number; output: number; cached?: number } | null
  supportsImages: boolean
  contextWindow: number | null
}

interface RawModel {
  id: string
  name?: string
  endpoint?: string
  pricing?: { input: number; output: number; cached?: number }
  modalities?: { input: string[]; output: string[] }
  contextWindow?: number
}

function tagModel(m: RawModel, inGo: boolean): OpenCodeModel {
  const isFree = !!m.pricing && m.pricing.input === 0 && m.pricing.output === 0 && (m.pricing.cached ?? 0) === 0
  const category: ModelCategory = inGo && isFree ? 'free' : inGo ? 'go' : isFree ? 'free' : 'zen'
  return {
    id: m.id,
    name: m.name ?? m.id,
    endpoint: m.endpoint ?? 'https://opencode.ai/zen/v1/chat/completions',
    category,
    pricing: m.pricing ?? null,
    supportsImages: (m.modalities?.input ?? []).some((s) => s.toLowerCase().includes('image')),
    contextWindow: m.contextWindow ?? null,
  }
}

export function mergeModels(zenModels: RawModel[], goModels: RawModel[]): OpenCodeModel[] {
  const goIds = new Set(goModels.map((m) => m.id))
  const byId = new Map<string, OpenCodeModel>()
  for (const m of zenModels) byId.set(m.id, tagModel(m, false))
  for (const m of goModels) {
    const existing = byId.get(m.id)
    if (existing) byId.set(m.id, { ...existing, category: existing.category === 'free' ? 'free' : 'go' })
    else byId.set(m.id, tagModel(m, true))
  }
  return Array.from(byId.values()).sort((a, b) => {
    const order: Record<ModelCategory, number> = { free: 0, zen: 1, go: 2 }
    if (order[a.category] !== order[b.category]) return order[a.category] - order[b.category]
    return a.name.localeCompare(b.name)
  })
}
