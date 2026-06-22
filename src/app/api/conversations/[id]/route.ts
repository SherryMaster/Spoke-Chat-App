import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversation } from '@/db/schema'

export const runtime = 'nodejs'

async function loadOwned(id: string, userId: string) {
  const rows = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const owned = await loadOwned(id, session.user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json()) as { title?: string; systemPrompt?: string | null; modelId?: string }
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.title !== undefined) updates.title = body.title
  if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt
  if (body.modelId !== undefined) updates.modelId = body.modelId

  const [row] = await db.update(conversation).set(updates).where(eq(conversation.id, id)).returning()
  return NextResponse.json({ conversation: row })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const owned = await loadOwned(id, session.user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(conversation).set({ deletedAt: new Date() }).where(eq(conversation.id, id))
  return NextResponse.json({ ok: true })
}
