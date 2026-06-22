import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversation } from '@/db/schema'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.userId, session.user.id), isNull(conversation.deletedAt)))
    .orderBy(desc(conversation.updatedAt))
    .limit(100)

  return NextResponse.json({ conversations: rows })
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { modelId, systemPrompt } = (await req.json()) as { modelId?: string; systemPrompt?: string }
  if (!modelId) return NextResponse.json({ error: 'modelId required' }, { status: 400 })

  const [row] = await db
    .insert(conversation)
    .values({ userId: session.user.id, modelId, systemPrompt: systemPrompt ?? null })
    .returning()

  return NextResponse.json({ conversation: row })
}
