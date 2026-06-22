import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userKey } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { AppShell } from '@/components/app/AppShell'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')
  const keys = await db.select().from(userKey).where(eq(userKey.userId, session.user.id)).limit(1)
  if (!keys.length) redirect('/onboarding')
  return <AppShell>{children}</AppShell>
}
