import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AppShell } from '@/components/app/AppShell'
import { SettingsPage } from '@/components/app/SettingsPage'

export default async function Settings() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  )
}
