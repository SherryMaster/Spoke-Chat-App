'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Square } from 'lucide-react'

export function Composer({
  onSend,
  onStop,
  isStreaming,
}: {
  onSend: (text: string) => void
  onStop: () => void
  isStreaming: boolean
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [value])

  const submit = () => {
    const v = value.trim()
    if (!v || isStreaming) return
    onSend(v)
    setValue('')
  }

  return (
    <div className="flex items-end gap-2 border-t p-3">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Type a message…  (Enter to send, Shift+Enter for newline)"
        rows={1}
        className="resize-none"
      />
      {isStreaming ? (
        <Button onClick={onStop} variant="outline" size="icon"><Square className="h-4 w-4" /></Button>
      ) : (
        <Button onClick={submit} disabled={!value.trim()} size="icon"><Send className="h-4 w-4" /></Button>
      )}
    </div>
  )
}
