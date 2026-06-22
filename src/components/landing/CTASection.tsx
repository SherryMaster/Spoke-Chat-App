import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="flex flex-col items-center gap-4 border-t py-16 text-center">
      <h2 className="text-2xl font-semibold">Ready to try it?</h2>
      <p className="text-muted-foreground">It takes about 30 seconds.</p>
      <Button asChild size="lg"><Link href="/sign-up">Create your account</Link></Button>
    </section>
  )
}
