import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { and, asc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversation, message } from '@/db/schema'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const owned = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.userId, session.user.id)))
    .limit(1)
  if (!owned.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, id))
    .orderBy(asc(message.createdAt))

  return NextResponse.json({
    conversation: owned[0],
    messages: rows.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts,
      metadata: m.metadata,
      createdAt: m.createdAt,
    })),
  })
}
