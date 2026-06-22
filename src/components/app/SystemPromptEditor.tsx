'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Settings2 } from 'lucide-react'

export function SystemPromptEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" />System prompt</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>System prompt</SheetTitle>
          <SheetDescription>Per-conversation instructions for the model. Leave empty for none.</SheetDescription>
        </SheetHeader>
        <Textarea
          className="mt-4 min-h-[300px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="You are a helpful assistant…"
        />
      </SheetContent>
    </Sheet>
  )
}
