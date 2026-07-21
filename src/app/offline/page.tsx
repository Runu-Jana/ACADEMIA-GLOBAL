import Link from 'next/link'
import { WifiOff, RefreshCw } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Aurora } from '@/components/fx/aurora'

export const metadata = { title: 'You are offline' }

export default function OfflinePage() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center">
      <Aurora palette="cool" density={2} />
      <div className="relative max-w-md">
        <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-3xl bg-muted text-muted-foreground">
          <WifiOff className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-extrabold">You&apos;re offline</h1>
        <p className="mt-2.5 text-pretty text-sm text-muted-foreground">
          We couldn&apos;t reach Academia Global. Downloaded study material stays available on
          your device — reconnect to sync your progress and open new lessons.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: 'primary' })}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Link>
        </div>
      </div>
    </div>
  )
}
