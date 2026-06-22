'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

export function SearchPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ conversations: any[]; messages: any[] }>({ conversations: [], messages: [] })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!q) { setResults({ conversations: [], messages: [] }); return }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search messages and chats…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {results.conversations.length > 0 && (
          <CommandGroup heading="Chats">
            {results.conversations.map((c: any) => (
              <CommandItem key={c.id} onSelect={() => { setOpen(false); router.push(`/chat/${c.id}`) }}>
                {c.title ?? 'New chat'}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.messages.length > 0 && (
          <CommandGroup heading="Messages">
            {results.messages.map((m: any) => (
              <CommandItem
                key={m.id}
                onSelect={() => { setOpen(false); router.push(`/chat/${m.conversation_id}`) }}
              >
                Message in conversation
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
