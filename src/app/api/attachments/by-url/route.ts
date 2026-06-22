import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messageAttachment } from '@/db/schema'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const u = new URL(req.url).searchParams.get('u')
  if (!u) return NextResponse.json({ error: 'Missing u' }, { status: 400 })
  const rows = await db.select().from(messageAttachment).where(eq(messageAttachment.blobUrl, u)).limit(1)
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.redirect(new URL(`/api/attachments/${rows[0].id}`, req.url), 302)
}
