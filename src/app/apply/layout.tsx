import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-3">
          <Logo />

          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11.5px] font-bold text-emerald-700 sm:inline-flex dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure admission process
          </span>

          <Link
            href="/dashboard"
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:ml-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* pb-20 clears the mobile tab bar used across the rest of the site. */}
      <main id="main" className="container flex-1 py-6 pb-20 lg:pb-10">
        {children}
      </main>
    </div>
  )
}
