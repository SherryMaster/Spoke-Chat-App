'use client'

import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { cn } from '@/lib/utils'
import type { ChatUIMessage } from '@/lib/ai/types'

export function MessageBubble({ message, isStreaming }: { message: ChatUIMessage; isStreaming: boolean }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-3xl rounded-lg px-4 py-3',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <Streamdown key={i} plugins={{ code }} isAnimating={isStreaming}>
                {part.text}
              </Streamdown>
            )
          }
          if (part.type === 'file') {
            if (part.mediaType?.startsWith('image/')) {
              return <img key={i} src={part.url} alt={part.filename ?? ''} className="mt-2 max-w-sm rounded" />
            }
            return (
              <a key={i} href={part.url} target="_blank" rel="noreferrer" className="mt-2 block underline">
                {part.filename ?? 'attachment'}
              </a>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
