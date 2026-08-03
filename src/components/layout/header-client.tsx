'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search, Bot, GitCompare, Menu, X, ChevronDown, LogOut,
  LayoutDashboard, GraduationCap, User as UserIcon, Shield,
} from 'lucide-react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { useCompare } from '@/lib/use-compare'
import { cn, initials } from '@/lib/utils'

export type HeaderUser = { id: string; name: string; email: string; role: string } | null

const NAV: {
  label: string
  href: string
  columns?: { title: string; links: { label: string; href: string }[] }[]
}[] = [
  {
    label: 'Online Degrees',
    href: '/courses?mode=ONLINE',
    columns: [
      {
        title: 'By Level',
        links: [
          { label: 'UG Online Degrees', href: '/courses?mode=ONLINE&level=UG' },
          { label: 'PG Online Degrees', href: '/courses?mode=ONLINE&level=PG' },
          { label: 'Diploma Online', href: '/courses?mode=ONLINE&level=DIPLOMA' },
          { label: 'Certificate Courses', href: '/courses?mode=ONLINE&level=CERTIFICATE' },
        ],
      },
      {
        title: 'Popular Streams',
        links: [
          { label: 'Management', href: '/courses?mode=ONLINE&stream=MANAGEMENT' },
          { label: 'IT & Software', href: '/courses?mode=ONLINE&stream=IT' },
          { label: 'Commerce', href: '/courses?mode=ONLINE&stream=COMMERCE' },
          { label: 'Arts & Humanities', href: '/courses?mode=ONLINE&stream=ARTS' },
        ],
      },
    ],
  },
  {
    label: 'Distance Degrees',
    href: '/courses?mode=DISTANCE',
    columns: [
      {
        title: 'UGC & DEB Approved',
        links: [
          { label: 'UG Distance Degrees', href: '/courses?mode=DISTANCE&level=UG' },
          { label: 'PG Distance Degrees', href: '/courses?mode=DISTANCE&level=PG' },
          { label: 'Diploma Courses', href: '/courses?mode=DISTANCE&level=DIPLOMA' },
          { label: 'Certificate Courses', href: '/courses?mode=DISTANCE&level=CERTIFICATE' },
        ],
      },
    ],
  },
  {
    label: 'Regular Degrees',
    href: '/courses?mode=REGULAR',
    columns: [
      {
        title: 'On-Campus Programs',
        links: [
          { label: 'Engineering', href: '/courses?mode=REGULAR&stream=ENGINEERING' },
          { label: 'Medical', href: '/courses?mode=REGULAR&stream=MEDICAL' },
          { label: 'Law', href: '/courses?mode=REGULAR&stream=LAW' },
          { label: 'Management', href: '/courses?mode=REGULAR&stream=MANAGEMENT' },
        ],
      },
    ],
  },
  {
    label: 'Part-Time Courses',
    href: '/courses?mode=PART_TIME',
    columns: [
      {
        title: 'For Working Professionals',
        links: [
          { label: 'Weekend Programs', href: '/courses?mode=PART_TIME' },
          { label: 'Evening Programs', href: '/courses?mode=PART_TIME&level=CERTIFICATE' },
          { label: 'Hybrid Programs', href: '/courses?mode=HYBRID' },
          { label: 'Short Term Courses', href: '/courses?level=CERTIFICATE' },
        ],
      },
    ],
  },
  { label: 'Universities', href: '/universities' },
  { label: 'Exams', href: '/exams' },
  { label: 'Scholarships', href: '/scholarships' },
]

export function HeaderClient({ user }: { user: HeaderUser }) {
  const router = useRouter()
  const pathname = usePathname()
  const { count } = useCompare()

  const [scrolled, setScrolled] = React.useState(false)
  const [drawer, setDrawer] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [q, setQ] = React.useState('')
  // The mega-nav dropdown is CSS hover/focus driven; clicking a link inside it
  // leaves the cursor hovering and the link focused, so it would stay open.
  // This force-closes the just-clicked menu until the pointer leaves the item.
  const [closedMenu, setClosedMenu] = React.useState<string | null>(null)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Any navigation closes every transient surface.
  React.useEffect(() => {
    setDrawer(false)
    setMenu(false)
    setClosedMenu(null)
  }, [pathname])

  React.useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(q.trim() ? `/courses?q=${encodeURIComponent(q.trim())}` : '/courses')
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          scrolled
            ? 'border-b border-border bg-background/85 backdrop-blur-xl shadow-soft'
            : 'border-b border-transparent bg-background',
        )}
      >
        {/* ---------------------------------------------------- primary bar */}
        <div className="container flex h-16 items-center gap-3 lg:h-[68px]">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          <Logo />

          <form onSubmit={submitSearch} className="ml-auto hidden max-w-md flex-1 md:block lg:ml-6">
            <div className="group relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search for Courses, Universities, Exams…"
                aria-label="Search courses"
                className="h-10 w-full rounded-xl border border-border bg-muted/60 pl-10 pr-24 text-sm outline-none transition-all duration-300 placeholder:text-muted-foreground/80 focus:border-primary-300 focus:bg-surface focus:ring-4 focus:ring-primary-500/10"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 grid h-7 w-9 -translate-y-1/2 place-items-center rounded-lg bg-primary-600 text-white transition-colors hover:bg-primary-700"
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5 md:ml-3">
            <Link
              href="/counsellor"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted xl:inline-flex"
            >
              <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-holo-sweep">
                <Bot className="h-4 w-4 text-white" />
              </span>
              Ask Saarthi
            </Link>

            <Link
              href="/compare"
              className="relative hidden items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted lg:inline-flex"
            >
              <GitCompare className="h-4 w-4 text-primary-600" />
              Compare
              {count > 0 && (
                <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent-orange px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            <ThemeToggle className="hidden sm:grid" />

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenu((v) => !v)}
                  aria-expanded={menu}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl border border-border py-1 pl-1 pr-2 transition-colors hover:border-primary-300"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-fade text-[11px] font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', menu && 'rotate-180')}
                  />
                </button>

                {menu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] z-20 w-60 animate-scale-in origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
                    >
                      <div className="border-b border-border bg-muted/50 p-3.5">
                        <p className="truncate text-sm font-bold">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        {user.role === 'ADMIN' && (
                          <MenuLink href="/admin" icon={Shield}>Admin Panel</MenuLink>
                        )}
                        <MenuLink href="/dashboard" icon={LayoutDashboard}>Dashboard</MenuLink>
                        <MenuLink href="/dashboard/learn" icon={GraduationCap}>My Learning</MenuLink>
                        <MenuLink href="/dashboard/profile" icon={UserIcon}>Profile</MenuLink>
                      </div>
                      <form action="/api/auth/logout" method="post" className="border-t border-border p-1.5">
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'hidden sm:inline-flex' })}>
                  Login
                </Link>
                <Link href="/signup" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- mega nav */}
        <nav aria-label="Course categories" className="hidden border-t border-border lg:block">
          <ul className="container flex items-center gap-1">
            {NAV.map((item) => (
              <li
                key={item.label}
                className="group relative"
                onMouseLeave={() => setClosedMenu(null)}
              >
                <Link
                  href={item.href}
                  onClick={(e) => {
                    setClosedMenu(item.label)
                    e.currentTarget.blur()
                  }}
                  className="flex items-center gap-1 px-3 py-3 text-[13px] font-semibold text-foreground/85 transition-colors hover:text-primary-600 group-hover:text-primary-600"
                >
                  {item.label}
                  {item.columns && (
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
                  )}
                </Link>

                {item.columns && (
                  <div
                    className={cn(
                      'invisible absolute left-0 top-full z-30 translate-y-2 opacity-0 transition-all duration-300 ease-spring group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100',
                      // Force-hidden after a click, overriding hover/focus, until the pointer leaves.
                      closedMenu === item.label && 'pointer-events-none !invisible !translate-y-2 !opacity-0',
                    )}
                  >
                    <div className="holo-ring mt-1 flex gap-7 rounded-2xl border border-border bg-card p-5 shadow-lift">
                      {item.columns.map((col) => (
                        <div key={col.title} className="min-w-[190px]">
                          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {col.title}
                          </p>
                          <ul className="space-y-0.5">
                            {col.links.map((l) => (
                              <li key={l.href}>
                                <Link
                                  href={l.href}
                                  onClick={(e) => {
                                    setClosedMenu(item.label)
                                    e.currentTarget.blur()
                                  }}
                                  className="block rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-foreground/85 transition-all hover:translate-x-0.5 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-500/10"
                                >
                                  {l.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
            <li className="ml-auto">
              <Link
                href="/verify"
                className="px-3 py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
              >
                Verify Certificate
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      {/* ------------------------------------------------------ mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm animate-in fade-in"
            onClick={() => setDrawer(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-background shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border p-4">
              <form onSubmit={submitSearch} className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search courses…"
                  aria-label="Search courses"
                  className="h-11 w-full rounded-xl border border-border bg-muted/60 pl-10 pr-3 text-sm outline-none focus:border-primary-300"
                />
              </form>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              {NAV.map((item) => (
                <details key={item.label} className="group border-b border-border/70 last:border-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-3 text-sm font-semibold marker:hidden">
                    {item.label}
                    {item.columns ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    ) : null}
                  </summary>
                  {item.columns ? (
                    <div className="pb-2">
                      {item.columns.flatMap((c) => c.links).map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="block rounded-lg px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </details>
              ))}

              <div className="mt-3 space-y-1 border-t border-border pt-3">
                <Link href="/counsellor" className="block rounded-lg px-2 py-2.5 text-sm font-semibold">Ask Saarthi</Link>
                <Link href="/compare" className="block rounded-lg px-2 py-2.5 text-sm font-semibold">Compare Courses {count > 0 && `(${count})`}</Link>
                <Link href="/verify" className="block rounded-lg px-2 py-2.5 text-sm font-semibold">Verify Certificate</Link>
              </div>
            </nav>

            <div className="flex items-center gap-2 border-t border-border p-4">
              {user ? (
                <Link href="/dashboard" className={buttonVariants({ className: 'flex-1' })}>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className={buttonVariants({ variant: 'outline', className: 'flex-1' })}>Login</Link>
                  <Link href="/signup" className={buttonVariants({ className: 'flex-1' })}>Sign Up</Link>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  )
}
