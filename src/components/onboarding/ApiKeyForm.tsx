'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ApiKeyForm() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/user-key', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    setLoading(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      toast.error(error)
      return
    }
    const { fingerprint } = await res.json()
    toast.success(`Key saved (${fingerprint})`)
    router.push('/chat')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="key">OpenCode API key</Label>
        <Input
          id="key"
          type="password"
          required
          placeholder="sk-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Get one at{' '}
          <a className="underline" href="https://opencode.ai/auth" target="_blank" rel="noreferrer">
            opencode.ai/auth
          </a>
          . Stored encrypted with AES-256-GCM. Never logged.
        </p>
      </div>
      <Button type="submit" disabled={loading || key.length < 8}>
        {loading ? 'Verifying…' : 'Save and continue'}
      </Button>
    </form>
  )
}
