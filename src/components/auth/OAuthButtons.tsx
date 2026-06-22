'use client'

import { Button } from '@/components/ui/button'
import { signIn } from '@/lib/auth-client'
import { toast } from 'sonner'

export function OAuthButtons() {
  const handle = async (provider: 'github' | 'google') => {
    const err = await signIn.social({ provider, callbackURL: '/chat' }).then((r) => r.error)
    if (err) toast.error(`Sign-in failed: ${err.message}`)
  }
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={() => handle('github')}>Continue with GitHub</Button>
      <Button variant="outline" onClick={() => handle('google')}>Continue with Google</Button>
    </div>
  )
}
