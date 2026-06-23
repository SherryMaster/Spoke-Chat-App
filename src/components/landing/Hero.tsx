import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        Spoke — chat with every OpenCode model.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        A web chat client for OpenCode. Bring your key. Your conversations sync
        across every device, encrypted at rest.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg"><Link href="/sign-up">Get started</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/sign-in">Sign in</Link></Button>
      </div>
    </section>
  )
}
