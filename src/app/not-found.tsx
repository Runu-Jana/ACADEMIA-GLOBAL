import Link from 'next/link'
import { Compass, Home } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Aurora, GridPattern } from '@/components/fx/aurora'

export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center">
      <Aurora palette="holo" density={3} />
      <GridPattern />
      <div className="relative max-w-lg">
        <p className="holo-text font-display text-7xl font-extrabold sm:text-8xl">404</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold">This page took a gap year</h1>
        <p className="mt-2.5 text-pretty text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back
          to your learning journey.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: 'holo' })}>
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link href="/courses" className={buttonVariants({ variant: 'outline' })}>
            <Compass className="h-4 w-4" />
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  )
}
