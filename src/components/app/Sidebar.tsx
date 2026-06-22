'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Download, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  title: string | null
  updatedAt: string
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [items, setItems] = useState<Conversation[]>([])

  const load = async () => {
    const res = await fetch('/api/conversations')
    if (res.ok) {
      const { conversations } = await res.json()
      setItems(conversations)
    }
  }
  useEffect(() => { load() }, [pathname])

  const newChat = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ modelId: 'claude-sonnet-4-6' }),
    })
    if (res.ok) {
      const { conversation } = await res.json()
      router.push(`/chat/${conversation.id}`)
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    setItems((xs) => xs.filter((x) => x.id !== id))
    if (pathname === `/chat/${id}`) router.push('/chat')
  }

  return (
    <aside className="flex w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between p-3">
        <Link href="/chat" className="font-semibold">Chats</Link>
        <Button size="icon" variant="ghost" onClick={newChat}><Plus className="h-4 w-4" /></Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {items.map((c) => (
          <div key={c.id} className={cn('group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted')}>
            <Link href={`/chat/${c.id}`} className="flex-1 truncate">
              {c.title ?? 'New chat'}
            </Link>
            <button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => window.open(`/api/conversations/${c.id}/export`, '_blank')} className="opacity-0 group-hover:opacity-100">
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
      </nav>
      <div className="border-t p-3 text-sm">
        <Link href="/settings" className="text-muted-foreground hover:underline">Settings</Link>
      </div>
    </aside>
  )
}
