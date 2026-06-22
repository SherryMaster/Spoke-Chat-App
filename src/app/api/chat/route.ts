import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { loadDecryptedKey } from '@/app/api/user-key/route'
import { streamConversation } from '@/lib/opencode/stream'
import type { ChatUIMessage } from '@/lib/ai/types'
import { createIdGenerator } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = await loadDecryptedKey(session.user.id)
  if (!apiKey) return NextResponse.json({ error: 'No API key configured', code: 'no_key' }, { status: 412 })

  const body = (await req.json()) as { id: string; message: ChatUIMessage }
  if (!body?.id || !body?.message) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  let stream
  try {
    stream = await streamConversation({
      userId: session.user.id,
      conversationId: body.id,
      apiKey,
      newUserMessage: body.message,
    })
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (msg === 'MODEL_NOT_AVAILABLE')
      return NextResponse.json({ error: 'Selected model not available for this key' }, { status: 400 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  stream.result.consumeStream()

  return stream.result.toUIMessageStreamResponse({
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    originalMessages: [body.message],
    onFinish: async ({ responseMessage }) => {
      try {
        await stream.persist(responseMessage as ChatUIMessage)
      } catch (err) {
        console.error('persist error', err)
      }
    },
    onError: (err) => {
      const m = (err as Error)?.message ?? 'Unknown error'
      return m.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-…REDACTED')
    },
  })
}
