'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, GraduationCap, Sparkles, LogOut, ExternalLink, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { cn, initials } from '@/lib/utils'

export type PartnerShellUser = { name: string; email: string }

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean }

function navFor(pending: boolean): NavItem[] {
  // A pending sign-up can only see the overview; the editor unlocks on approval.
  if (pending) return [{ href: '/partner', label: 'Overview', icon: LayoutDashboard, exact: true }]
  return [
    { href: '/partner', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/partner/programmes', label: 'Programmes', icon: GraduationCap },
    { href: '/partner/ingest', label: 'Add with AI', icon: Sparkles },
  ]
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function PartnerShell({
  user,
  universityName,
  partnerStatus,
  pending,
  children,
}: {
  user: PartnerShellUser
  universityName: string
  partnerStatus: string
  pending: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const nav = navFor(pending)

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="container flex h-14 items-center gap-3">
          <Link href="/partner" className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-holo-sweep">
              <Building2 className="h-4 w-4 text-white" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate font-display text-[13px] font-extrabold leading-tight">
                {universityName}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[.16em] text-primary-500">
                Partner Portal
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Badge tone={partnerStatus === 'ACTIVE' ? 'success' : 'warning'} className="hidden sm:inline-flex">
              {partnerStatus === 'ACTIVE' ? 'Active partner' : 'Under review'}
            </Badge>
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600 md:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </Link>
            <ThemeToggle />
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-fade text-[11px] font-bold text-white"
              title={user.name}
              aria-hidden
            >
              {initials(user.name)}
            </span>
          </div>
        </div>

        {/* horizontal nav — scrolls on narrow screens */}
        <nav aria-label="Partner sections" className="container -mt-px overflow-x-auto">
          <ul className="flex gap-1 pb-1">
            {nav.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(pathname, href, exact)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] font-semibold transition-colors',
                      active
                        ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main id="main" className="container py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
