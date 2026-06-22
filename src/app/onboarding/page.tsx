import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userKey } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ApiKeyForm } from '@/components/onboarding/ApiKeyForm'

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const existing = await db.select().from(userKey).where(eq(userKey.userId, session.user.id)).limit(1)
  if (existing.length) redirect('/chat')

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Add your OpenCode API key</h1>
      <p className="text-sm text-muted-foreground">
        We need this to call OpenCode's models on your behalf. The key never leaves this account
        and is never logged.
      </p>
      <ApiKeyForm />
    </main>
  )
}
