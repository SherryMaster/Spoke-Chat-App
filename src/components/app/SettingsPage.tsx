'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { signOut } from '@/lib/auth-client'
import { toast } from 'sonner'

export function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/user-key')
      .then((r) => r.json())
      .then((d) => setFingerprint(d.fingerprint ?? null))
  }, [])

  const save = async () => {
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
    const { fingerprint: fp } = await res.json()
    setFingerprint(fp)
    setKey('')
    toast.success('Key updated')
  }

  const remove = async () => {
    await fetch('/api/user-key', { method: 'DELETE' })
    setFingerprint(null)
    router.push('/onboarding')
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">OpenCode API key</h2>
        {fingerprint && (
          <p className="text-sm text-muted-foreground">
            Current key: <code>{fingerprint}</code>
          </p>
        )}
        <div>
          <Label htmlFor="key">Replace key</Label>
          <Input id="key" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={loading || key.length < 8}>Save</Button>
          {fingerprint && <Button variant="outline" onClick={remove}>Delete</Button>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Theme</h2>
        <div className="flex gap-2">
          {['light', 'dark', 'system'].map((t) => (
            <Button key={t} variant={theme === t ? 'default' : 'outline'} onClick={() => setTheme(t)}>{t}</Button>
          ))}
        </div>
      </section>

      <section>
        <Button variant="destructive" onClick={() => signOut().then(() => router.push('/'))}>
          Sign out
        </Button>
      </section>
    </div>
  )
}
