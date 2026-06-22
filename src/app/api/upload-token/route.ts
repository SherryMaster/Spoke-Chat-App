import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const blob = await put(file.name, file, {
    access: 'private',
    contentType: file.type || 'application/octet-stream',
    addRandomSuffix: true,
  })

  return NextResponse.json({ url: blob.url, downloadUrl: blob.downloadUrl, pathname: blob.pathname })
}
