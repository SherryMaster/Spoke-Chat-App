'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

type Model = {
  id: string
  name: string
  category: 'free' | 'zen' | 'go'
  pricing: { input: number; output: number } | null
}

export function ModelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [models, setModels] = useState<Model[]>([])
  const [hasGo, setHasGo] = useState(false)

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((d) => { setModels(d.models ?? []); setHasGo(!!d.hasGo) })
      .catch(() => {})
  }, [])

  const groups: Record<string, Model[]> = { Free: [], Zen: [], Go: [] }
  for (const m of models) groups[m.category === 'free' ? 'Free' : m.category === 'go' ? 'Go' : 'Zen'].push(m)

  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger className="w-72">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.Free.length > 0 && (
          <SelectGroup>
            <SelectLabel>Free</SelectLabel>
            {groups.Free.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectGroup>
        )}
        {groups.Zen.length > 0 && (
          <SelectGroup>
            <SelectLabel>Zen (paid)</SelectLabel>
            {groups.Zen.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectGroup>
        )}
        {groups.Go.length > 0 && (
          <SelectGroup>
            <SelectLabel>Go (subscription){!hasGo && ' — upgrade at opencode.ai/auth'}</SelectLabel>
            {groups.Go.map((m) => <SelectItem key={m.id} value={m.id} disabled={!hasGo}>{m.name}</SelectItem>)}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
