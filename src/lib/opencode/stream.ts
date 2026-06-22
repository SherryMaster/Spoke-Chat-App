import { streamText, convertToModelMessages } from 'ai'
import { getOpenCodeModel } from './provider'
import { fetchModelsForUser } from './fetch'
import { db } from '@/lib/db'
import { conversation, message, messageAttachment } from '@/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import type { ChatUIMessage } from '@/lib/ai/types'

export interface StreamOptions {
  userId: string
  conversationId: string
  apiKey: string
  newUserMessage: ChatUIMessage
}

export async function streamConversation({ userId, conversationId, apiKey, newUserMessage }: StreamOptions) {
  const convRows = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, conversationId), eq(conversation.userId, userId)))
    .limit(1)
  if (!convRows.length) throw new Error('NOT_FOUND')
  const conv = convRows[0]

  const history = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(asc(message.createdAt))

  const historyMessages: ChatUIMessage[] = history.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    parts: m.parts as any,
    metadata: (m.metadata ?? undefined) as any,
  }))

  const [userRow] = await db
    .insert(message)
    .values({
      conversationId,
      role: 'user',
      parts: newUserMessage.parts as any,
      modelId: null,
      metadata: null,
    })
    .returning()

  const allMessages: ChatUIMessage[] = [
    ...historyMessages,
    { ...newUserMessage, id: userRow.id },
  ]

  const { models } = await fetchModelsForUser(apiKey)
  const meta = models.find((m) => m.id === conv.modelId)
  if (!meta) throw new Error('MODEL_NOT_AVAILABLE')
  const model = getOpenCodeModel(conv.modelId, apiKey, meta)

  // Persist file attachment rows
  const fileParts = (newUserMessage.parts as any[]).filter((p) => p.type === 'file')
  if (fileParts.length) {
    await db.insert(messageAttachment).values(
      fileParts.map((p: any) => ({
        messageId: userRow.id,
        filename: p.filename ?? 'attachment',
        mimeType: p.mediaType ?? 'application/octet-stream',
        sizeBytes: 0,
        blobUrl: p.url,
      })),
    )
  }

  const start = Date.now()
  const result = streamText({
    model,
    system: conv.systemPrompt ?? undefined,
    messages: await convertToModelMessages(allMessages),
  })

  return {
    result,
    conversationHasTitle: !!conv.title,
    conversationModelId: conv.modelId,
    conversationId,
    allMessages,
    persist: async (responseMessage: ChatUIMessage) => {
      await db.insert(message).values({
        id: responseMessage.id,
        conversationId,
        role: 'assistant',
        parts: responseMessage.parts as any,
        modelId: conv.modelId,
        metadata: {
          durationMs: Date.now() - start,
        },
      })
    },
  }
}
