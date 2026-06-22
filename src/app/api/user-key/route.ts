import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userKey } from '@/db/schema'
import { encryptKey, keyFingerprint, decryptKey } from '@/lib/crypto'
import { fetchModelsForUser } from '@/lib/opencode/fetch'

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = (await req.json()) as { key?: string }
  if (!key || key.length < 8) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  // Verify the key by calling /zen/v1/models
  try {
    await fetchModelsForUser(key)
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't reach OpenCode: ${(err as Error).message}` },
      { status: 400 },
    )
  }

  const enc = encryptKey(key)
  const fp = keyFingerprint(key)
  const now = new Date()

  await db
    .insert(userKey)
    .values({
      userId: session.user.id,
      encryptedKey: enc.ciphertext,
      iv: enc.iv,
      authTag: enc.authTag,
      keyFingerprint: fp,
      verifiedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userKey.userId,
      set: {
        encryptedKey: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
        keyFingerprint: fp,
        verifiedAt: now,
        updatedAt: now,
      },
    })

  return NextResponse.json({ fingerprint: fp })
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.delete(userKey).where(eq(userKey.userId, session.user.id))
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db.select().from(userKey).where(eq(userKey.userId, session.user.id)).limit(1)
  if (!rows.length) return NextResponse.json({ hasKey: false })
  return NextResponse.json({ hasKey: true, fingerprint: rows[0].keyFingerprint, verifiedAt: rows[0].verifiedAt })
}

// Helper used by /api/chat — exported for that route
export async function loadDecryptedKey(userId: string): Promise<string | null> {
  const rows = await db.select().from(userKey).where(eq(userKey.userId, userId)).limit(1)
  if (!rows.length) return null
  const r = rows[0]
  return decryptKey({ ciphertext: r.encryptedKey, iv: r.iv, authTag: r.authTag })
}
