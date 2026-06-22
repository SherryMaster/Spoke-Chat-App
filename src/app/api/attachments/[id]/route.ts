import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { message, messageAttachment, conversation } from '@/db/schema'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const attRows = await db.select().from(messageAttachment).where(eq(messageAttachment.id, id)).limit(1)
  if (!attRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const att = attRows[0]

  const msgRows = await db.select().from(message).where(eq(message.id, att.messageId)).limit(1)
  if (!msgRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const convRows = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, msgRows[0].conversationId), eq(conversation.userId, session.user.id)))
    .limit(1)
  if (!convRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.redirect(att.blobUrl, 302)
}
