import { mergeModels, type OpenCodeModel } from './models'

const ZEN = 'https://opencode.ai/zen/v1'
const GO = 'https://opencode.ai/zen/go/v1'

async function fetchList(url: string, key: string) {
  const res = await fetch(`${url}/models`, { headers: { authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`OpenCode ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as { data: any[] }
  return body.data ?? []
}

export async function fetchModelsForUser(key: string): Promise<{ models: OpenCodeModel[]; hasGo: boolean }> {
  const [zenRes, goRes] = await Promise.allSettled([
    fetchList(ZEN, key),
    fetchList(GO, key),
  ])
  const zen = zenRes.status === 'fulfilled' ? zenRes.value : []
  const go = goRes.status === 'fulfilled' ? goRes.value : []
  return { models: mergeModels(zen, go), hasGo: go.length > 0 }
}
