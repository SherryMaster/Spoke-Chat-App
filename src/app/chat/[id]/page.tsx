import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { and, asc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversation, message, userKey } from '@/db/schema'
import { ChatView } from '@/components/app/ChatView'
import type { ChatUIMessage } from '@/lib/ai/types'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const keys = await db.select().from(userKey).where(eq(userKey.userId, session.user.id)).limit(1)
  if (!keys.length) redirect('/onboarding')

  const convRows = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.userId, session.user.id)))
    .limit(1)
  if (!convRows.length) notFound()
  const conv = convRows[0]

  const msgs = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, id))
    .orderBy(asc(message.createdAt))

  const initial: ChatUIMessage[] = msgs.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    parts: m.parts as any,
    metadata: (m.metadata ?? undefined) as any,
  }))

  return (
    <ChatView
      id={conv.id}
      initialMessages={initial}
      initialModelId={conv.modelId}
      initialSystemPrompt={conv.systemPrompt}
    />
  )
}
