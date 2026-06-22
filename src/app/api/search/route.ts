import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { sql, eq, and, ilike } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversation } from '@/db/schema'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ results: { conversations: [], messages: [] } })

  const titleHits = await db
    .select({ id: conversation.id, title: conversation.title })
    .from(conversation)
    .where(and(eq(conversation.userId, session.user.id), ilike(conversation.title, `%${q}%`)))
    .limit(10)

  const msgHits = await db.execute(sql`
    SELECT m.id, m.conversation_id
    FROM conversation c
    JOIN message m ON m.conversation_id = c.id
    WHERE c.user_id = ${session.user.id}
      AND m.parts::text ILIKE ${'%' + q + '%'}
    ORDER BY m.created_at DESC
    LIMIT 20
  `)

  return NextResponse.json({ results: { conversations: titleHits, messages: msgHits.rows ?? [] } })
}
