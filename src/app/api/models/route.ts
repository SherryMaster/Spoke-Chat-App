import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { loadDecryptedKey } from '@/app/api/user-key/route'
import { fetchModelsForUser } from '@/lib/opencode/fetch'
import { db } from '@/lib/db'
import { userKey } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'
export const maxDuration = 30

const cache = new Map<string, { at: number; data: { models: any[]; hasGo: boolean } }>()
const TTL_MS = 5 * 60 * 1000

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = await loadDecryptedKey(session.user.id)
  if (!key) return NextResponse.json({ error: 'No API key configured' }, { status: 412 })

  const cached = cache.get(session.user.id)
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json(cached.data)
  }

  try {
    const data = await fetchModelsForUser(key)
    cache.set(session.user.id, { at: Date.now(), data })
    // Update verifiedAt as a side effect
    await db.update(userKey).set({ verifiedAt: new Date() }).where(eq(userKey.userId, session.user.id))
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: `OpenCode unreachable: ${(err as Error).message}` },
      { status: 502 },
    )
  }
}
