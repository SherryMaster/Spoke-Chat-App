import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Hero } from '@/components/landing/Hero'
import { FeatureBlocks } from '@/components/landing/FeatureBlocks'
import { CTASection } from '@/components/landing/CTASection'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/chat')
  return (
    <main>
      <Hero />
      <FeatureBlocks />
      <CTASection />
    </main>
  )
}
