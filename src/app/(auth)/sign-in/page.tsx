import Link from 'next/link'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { SignInForm } from '@/components/auth/SignInForm'

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <OAuthButtons />
      <div className="relative text-center text-xs text-muted-foreground"><span>or</span></div>
      <SignInForm />
      <p className="text-sm text-muted-foreground">
        Don't have an account? <Link className="underline" href="/sign-up">Sign up</Link>
      </p>
    </main>
  )
}
