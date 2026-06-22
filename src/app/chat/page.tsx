import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userKey } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function ChatIndex() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const keys = await db.select().from(userKey).where(eq(userKey.userId, session.user.id)).limit(1)
  if (!keys.length) redirect('/onboarding')

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Start a new chat</h2>
        <p className="mt-1 text-sm">Use the sidebar or the button below to begin.</p>
      </div>
    </div>
  )
}
