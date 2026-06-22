import Link from 'next/link'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { SignUpForm } from '@/components/auth/SignUpForm'

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <OAuthButtons />
      <div className="relative text-center text-xs text-muted-foreground"><span>or</span></div>
      <SignUpForm />
      <p className="text-sm text-muted-foreground">
        Already have an account? <Link className="underline" href="/sign-in">Sign in</Link>
      </p>
    </main>
  )
}
