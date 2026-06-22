import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        Your AI chat, powered by your own OpenCode account.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Bring your OpenCode API key. Get every model OpenCode offers, on every device,
        with your conversations synced and your key encrypted.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg"><Link href="/sign-up">Get started</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/sign-in">Sign in</Link></Button>
      </div>
    </section>
  )
}
