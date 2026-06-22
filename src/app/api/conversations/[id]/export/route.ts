import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { and, asc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversation, message } from '@/db/schema'

export const runtime = 'nodejs'

function renderText(text: string) {
  return text
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const convRows = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.userId, session.user.id)))
    .limit(1)
  if (!convRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const conv = convRows[0]

  const msgs = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, id))
    .orderBy(asc(message.createdAt))

  const lines: string[] = []
  lines.push(`# ${conv.title ?? 'New chat'}`)
  lines.push('')
  if (conv.systemPrompt) {
    lines.push('> System: ' + conv.systemPrompt)
    lines.push('')
  }
  for (const m of msgs) {
    lines.push(`## ${m.role === 'user' ? 'You' : 'Assistant'}`)
    lines.push('')
    for (const part of (m.parts as any[]) ?? []) {
      if (part.type === 'text') lines.push(renderText(part.text))
      if (part.type === 'file') lines.push(`[${part.filename ?? 'attachment'}](${part.url})`)
    }
    lines.push('')
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${(conv.title ?? 'chat').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md"`,
    },
  })
}
