'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'
import { ModelPicker } from './ModelPicker'
import { SystemPromptEditor } from './SystemPromptEditor'
import type { ChatUIMessage } from '@/lib/ai/types'

export function ChatView({
  id,
  initialMessages,
  initialModelId,
  initialSystemPrompt,
}: {
  id: string
  initialMessages: ChatUIMessage[]
  initialModelId: string
  initialSystemPrompt: string | null
}) {
  const transport = useRef(
    new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages, id: chatId }) => ({
        body: { id: chatId, message: messages[messages.length - 1] },
      }),
    }),
  ).current

  const { messages, sendMessage, status, stop } = useChat<ChatUIMessage>({
    id,
    messages: initialMessages,
    transport,
  })

  const [modelId, setModelId] = useState(initialModelId)
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt ?? '')
  const isStreaming = status === 'streaming' || status === 'submitted'

  const updateConversation = async (patch: Record<string, unknown>) => {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  const scrollerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, status])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <ModelPicker
          value={modelId}
          onChange={(v) => {
            setModelId(v)
            void updateConversation({ modelId: v })
          }}
        />
        <SystemPromptEditor
          value={systemPrompt}
          onChange={(v) => {
            setSystemPrompt(v)
            void updateConversation({ systemPrompt: v || null })
          }}
        />
      </div>
      <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isStreaming={isStreaming && m.id === messages[messages.length - 1]?.id} />
        ))}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Send a message to start the conversation.
          </div>
        )}
      </div>
      <Composer
        isStreaming={isStreaming}
        onSend={(text) => sendMessage({ text })}
        onStop={() => stop()}
      />
    </div>
  )
}
