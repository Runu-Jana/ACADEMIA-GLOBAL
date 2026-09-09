'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  GraduationCap,
  Layers3,
  FolderUp,
  Video,
  ClipboardList,
  Users,
  ClipboardCheck,
  FileCheck2,
  Building2,
  BadgeCheck,
  MessageSquare,
  Award,
  Inbox,
  Wallet,
  PhoneCall,
  Sparkles,
  Import,
  ShoppingBag,
  PackageCheck,
  Ticket,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Bell,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { cn, initials } from '@/lib/utils'
import { useMountTransition } from '@/lib/use-mount-transition'

export type AdminShellUser = { name: string; email: string }
export type AdminNotification = { title: string; body: string; href: string }

/**
 * Nav is declared as data (not JSX) so the same list drives the desktop rail,
 * the mobile drawer and the topbar title.
 */
const NAV: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Courses', icon: GraduationCap },
  { href: '/admin/modules', label: 'Modules & Lessons', icon: Layers3 },
  { href: '/admin/materials', label: 'Study Material', icon: FolderUp },
  { href: '/admin/live', label: 'Live Classes', icon: Video },
  { href: '/admin/tests', label: 'Tests & Exams', icon: ClipboardList },
  { href: '/admin/academics', label: 'Academics', icon: GraduationCap },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/enrolments', label: 'Enrolments', icon: ClipboardCheck },
  { href: '/admin/applications', label: 'Applications', icon: FileCheck2 },
  { href: '/admin/leads', label: 'Leads', icon: PhoneCall },
  { href: '/admin/reviews', label: 'Programme Reviews', icon: BadgeCheck },
  { href: '/admin/feedback', label: 'Learner Reviews', icon: MessageSquare },
  { href: '/admin/certificates', label: 'Certificates', icon: Award },
  { href: '/admin/partners', label: 'Partner Requests', icon: Inbox },
  { href: '/admin/universities', label: 'Universities', icon: Building2 },
  { href: '/admin/directory', label: 'Directory Import', icon: Import },
  { href: '/admin/shop', label: 'Shop Products', icon: ShoppingBag, exact: true },
  { href: '/admin/shop/orders', label: 'Shop Orders', icon: PackageCheck },
  { href: '/admin/promotions', label: 'Promotions', icon: Ticket },
  { href: '/admin/finance', label: 'Finance', icon: Wallet },
  { href: '/admin/ai-usage', label: 'AI Usage', icon: Sparkles },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({
  user,
  notifications = [],
  children,
}: {
  user: AdminShellUser
  notifications?: AdminNotification[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [drawer, setDrawer] = React.useState(false)
  // Keeps the panel mounted while it slides back out.
  const { mounted: drawerMounted, visible: drawerVisible } = useMountTransition(drawer)
  const [bell, setBell] = React.useState(false)
  const bellPanelRef = React.useRef<HTMLDivElement>(null)
  const bellWrapRef = React.useRef<HTMLDivElement>(null)

  // Any navigation closes the drawer and the notifications panel.
  React.useEffect(() => {
    setDrawer(false)
    setBell(false)
  }, [pathname])

  // Scrolling the page (or pressing Escape) dismisses the notifications panel —
  // but keep it open while scrolling inside its own list.
  React.useEffect(() => {
    if (!bell) return
    const onScroll = (e: Event) => {
      // `e.target` may be `window`/`document` (not an Element) — guard the
      // containment check so it never throws and always closes on page scroll.
      const t = e.target
      if (t instanceof Node && bellPanelRef.current?.contains(t)) return
      setBell(false)
    }
    const onPointerDown = (e: Event) => {
      // Clicks/taps outside the bell (button + panel) close it. A document
      // listener is robust; an overlay div can't span the viewport because the
      // header's backdrop-filter makes it the containing block for fixed kids.
      const t = e.target
      if (t instanceof Node && bellWrapRef.current?.contains(t)) return
      setBell(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBell(false)
    }
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [bell])

  React.useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  const current = [...NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => isActive(pathname, n.href, n.exact))

  return (
    <div className="flex min-h-dvh bg-muted/40 lg:h-dvh lg:overflow-hidden">
      {/* ------------------------------------------------------ desktop rail */}
      {/* Static flex column (not fixed) so it can never overlap the content
          and owns its own internal scroll, independent of the main pane. */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-primary-900/60 bg-primary-950 lg:flex">
        <SidebarBody pathname={pathname} user={user} />
      </aside>

      {/* ---------------------------------------------------- mobile drawer */}
      {drawerMounted && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          {/* A real button, not a div: iOS Safari does not reliably fire click
              on a plain non-interactive element, which breaks tap-to-close. */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
            className={cn(
              'absolute inset-0 h-full w-full cursor-pointer bg-slate-950/60 backdrop-blur-sm',
              'transition-opacity duration-300 ease-spring will-change-[opacity]',
              drawerVisible ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className={cn(
              'absolute inset-y-0 left-0 flex w-[84%] max-w-[17rem] flex-col bg-primary-950 shadow-2xl',
              'transition-transform duration-300 ease-spring will-change-transform',
              drawerVisible ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border border-white/20 text-white/80 transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody pathname={pathname} user={user} />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ shell */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-dvh lg:overflow-y-auto">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2.5 px-4 sm:px-5">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600 lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[15px] font-extrabold leading-tight tracking-tight">
                {current?.label ?? 'Admin'}
              </h1>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                Shiksha Sarthi control panel
              </p>
            </div>

            <Badge tone="holo" className="hidden shrink-0 sm:inline-flex">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>

            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600 md:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </Link>

            {/* ------------------------------------------ notifications bell */}
            <div className="relative" ref={bellWrapRef}>
              <button
                type="button"
                onClick={() => setBell((v) => !v)}
                aria-expanded={bell}
                aria-haspopup="dialog"
                aria-label={`Notifications${notifications.length ? ` (${notifications.length} waiting)` : ''}`}
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-orange ring-2 ring-background" />
                )}
              </button>

              {bell && (
                <>
                  <div
                    ref={bellPanelRef}
                    role="dialog"
                    aria-label="Notifications"
                    className="absolute right-0 top-[calc(100%+8px)] z-20 w-[min(20rem,calc(100vw-2rem))] animate-scale-in origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
                  >
                    <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                      <p className="text-sm font-bold">Leads to work</p>
                      {notifications.length > 0 && (
                        <Badge tone="warning" className="shrink-0">{notifications.length}</Badge>
                      )}
                    </div>
                    {notifications.length ? (
                      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                        {notifications.map((n, i) => (
                          <li key={i}>
                            <Link href={n.href} className="block px-4 py-3 transition-colors hover:bg-muted/60">
                              <p className="text-[13px] font-bold">{n.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No leads waiting right now.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <ThemeToggle />

            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-fade text-[11px] font-bold text-white"
              title={user.name}
              aria-hidden
            >
              {initials(user.name)}
            </span>
          </div>
        </header>

        <main id="main" className="px-4 py-5 sm:px-5 sm:py-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarBody({ pathname, user }: { pathname: string; user: AdminShellUser }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-holo-sweep">
          <ShieldCheck className="h-4 w-4 text-white" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-[13px] font-extrabold leading-tight text-white">
            Shiksha Sarthi
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-[.16em] text-holo-cyan">
            Admin Panel
          </span>
        </span>
      </div>

      <nav aria-label="Admin sections" className="scrollbar-slim flex-1 overflow-y-auto p-2.5">
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(pathname, href, exact)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-primary-100/70 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-holo-sweep bg-[length:100%_200%]"
                    />
                  )}
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-holo-cyan' : 'text-primary-200/60')} />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-holo-sweep text-[11px] font-bold text-white">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-bold text-white">{user.name}</span>
            <span className="block truncate text-[10px] text-primary-100/60">{user.email}</span>
          </span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[12px] font-semibold text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </>
  )
}
