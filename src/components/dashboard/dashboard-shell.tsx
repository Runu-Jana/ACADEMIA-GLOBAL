'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Video,
  LayoutDashboard, BookOpen, GraduationCap, FolderOpen, PenSquare, ClipboardList,
  Award, FileText, User as UserIcon, LifeBuoy, Menu, X, Search, ChevronDown, LogOut,
  PanelLeftClose, PanelLeft, Home, Compass, Rocket, Heart, Target,
} from 'lucide-react'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { MobileTabBar } from '@/components/layout/mobile-tabbar'
import { NotificationBell } from './notification-bell'
import { cn, initials } from '@/lib/utils'
import { useMountTransition } from '@/lib/use-mount-transition'

export type ShellUser = {
  id: string
  name: string
  email: string
  role: string
}

type NavItem = {
  /** Message key under dashboard.nav.* for the label. */
  key?: string
  href: string
  icon: React.ElementType
  /** Active only on an exact pathname match. */
  exact?: boolean
  /** Active whenever the pathname starts with this prefix. */
  prefix?: string
}

const NAV: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { key: 'myCourses', href: '/dashboard/learn', icon: BookOpen, exact: true },
  { key: 'myLearning', href: '/dashboard/learn/continue', icon: GraduationCap, prefix: '/dashboard/learn/' },
  { key: 'live', href: '/dashboard/live', icon: Video },
  { key: 'academics', href: '/dashboard/academics', icon: GraduationCap },
  { key: 'materials', href: '/dashboard/materials', icon: FolderOpen },
  { key: 'assignments', href: '/dashboard/assignments', icon: PenSquare },
  { key: 'tests', href: '/dashboard/tests', icon: ClipboardList },
  { key: 'certificates', href: '/dashboard/certificates', icon: Award },
  { key: 'goals', href: '/dashboard/goals', icon: Target },
  { key: 'saved', href: '/dashboard/saved', icon: Heart },
  { key: 'resume', href: '/dashboard/resume', icon: FileText },
  { key: 'career', href: '/dashboard/career', icon: Rocket },
  { key: 'profile', href: '/dashboard/profile', icon: UserIcon },
  { key: 'support', href: '/dashboard/support', icon: LifeBuoy },
]

// Header title per route. `tkey` is a path under the dashboard namespace; most
// reuse the nav label, a few (Goals) differ.
const TITLES: { prefix: string; tkey: string; exact?: boolean }[] = [
  { prefix: '/dashboard', tkey: 'nav.dashboard', exact: true },
  { prefix: '/dashboard/learn', tkey: 'nav.myCourses', exact: true },
  { prefix: '/dashboard/learn/', tkey: 'nav.myLearning' },
  { prefix: '/dashboard/live', tkey: 'nav.live' },
  { prefix: '/dashboard/academics', tkey: 'nav.academics' },
  { prefix: '/dashboard/materials', tkey: 'nav.materials' },
  { prefix: '/dashboard/assignments', tkey: 'nav.assignments' },
  { prefix: '/dashboard/tests', tkey: 'nav.tests' },
  { prefix: '/dashboard/certificates', tkey: 'nav.certificates' },
  { prefix: '/dashboard/goals', tkey: 'shell.goalsTitle' },
  { prefix: '/dashboard/saved', tkey: 'nav.saved' },
  { prefix: '/dashboard/resume', tkey: 'nav.resume' },
  { prefix: '/dashboard/career', tkey: 'nav.career' },
  { prefix: '/dashboard/profile', tkey: 'nav.profile' },
  { prefix: '/dashboard/support', tkey: 'nav.support' },
]

function pageTitleKey(pathname: string) {
  // Entries are ordered least → most specific, so the last match wins.
  const matches = TITLES.filter((t) =>
    t.exact ? pathname === t.prefix : pathname.startsWith(t.prefix),
  )
  return matches.length ? matches[matches.length - 1].tkey : 'nav.dashboard'
}

function isActive(item: NavItem, pathname: string) {
  if (item.prefix) return pathname.startsWith(item.prefix)
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function DashboardShell({
  user,
  initialUnread,
  children,
}: {
  user: ShellUser
  initialUnread: number
  children: React.ReactNode
}) {
  const t = useTranslations('dashboard')
  const pathname = usePathname()
  const router = useRouter()

  const [collapsed, setCollapsed] = React.useState(false)
  const [drawer, setDrawer] = React.useState(false)
  // Keeps the panel mounted while it slides back out.
  const { mounted: drawerMounted, visible: drawerVisible } = useMountTransition(drawer)
  const [menu, setMenu] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('ag_sidebar') === 'collapsed')
    } catch {
      // Storage disabled — the sidebar just starts expanded.
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem('ag_sidebar', next ? 'collapsed' : 'expanded')
      } catch {
        // Ignore — the preference simply won't persist.
      }
      return next
    })
  }

  // Any navigation closes every transient surface.
  React.useEffect(() => {
    setDrawer(false)
    setMenu(false)
  }, [pathname])

  React.useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setDrawer(false)
      setMenu(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Dismiss the account menu on an outside pointer-down. A rendered backdrop
  // can't do this reliably here: the blurred header is a containing block for
  // fixed children, so a "full-screen" overlay only covers the header strip.
  React.useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menu])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/dashboard/materials?q=${encodeURIComponent(term)}` : '/dashboard/materials')
  }

  const title = t(pageTitleKey(pathname))

  return (
    <div className="min-h-dvh bg-background">
      {/* ------------------------------------------------- desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card lg:flex',
          'transition-[width] duration-300 ease-spring print:hidden',
          collapsed ? 'w-[76px]' : 'w-[252px]',
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-border px-4', collapsed && 'justify-center px-2')}>
          <Logo compact={collapsed} />
        </div>

        <nav aria-label={t('shell.navAria')} className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.key}>
                <SideLink item={item} label={t(`nav.${item.key}`)} active={isActive(item, pathname)} collapsed={collapsed} />
              </li>
            ))}
          </ul>

          <div className="my-3 border-t border-border" />

          <ul className="space-y-1">
            <li>
              <SideLink
                item={{ href: '/courses', icon: Compass }}
                label={t('nav.browseCourses')}
                active={false}
                collapsed={collapsed}
              />
            </li>
            <li>
              <SideLink
                item={{ href: '/', icon: Home }}
                label={t('nav.backToSite')}
                active={false}
                collapsed={collapsed}
              />
            </li>
          </ul>
        </nav>

        <div className={cn('border-t border-border p-3', collapsed && 'flex justify-center')}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
            title={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
            className={cn(
              'flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-muted-foreground',
              'transition-colors hover:bg-muted hover:text-foreground',
              collapsed ? 'w-10 justify-center px-0' : 'w-full',
            )}
          >
            {collapsed ? <PanelLeft className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            {!collapsed && t('shell.collapse')}
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------- mobile drawer */}
      {drawerMounted && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* A real button, not a div: iOS Safari does not reliably fire click
              on a plain non-interactive element, which breaks tap-to-close. */}
          <button
            type="button"
            aria-label={t('shell.closeMenu')}
            onClick={() => setDrawer(false)}
            className={cn(
              'absolute inset-0 h-full w-full cursor-pointer bg-slate-950/55 backdrop-blur-sm',
              'transition-opacity duration-300 ease-spring will-change-[opacity]',
              drawerVisible ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('shell.menuAria')}
            className={cn(
              'absolute inset-y-0 left-0 flex w-[84%] max-w-[300px] flex-col bg-background shadow-2xl',
              'transition-transform duration-300 ease-spring will-change-transform',
              drawerVisible ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label={t('shell.closeMenu')}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-border p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-fade text-[13px] font-bold text-white">
                {initials(user.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <nav aria-label={t('shell.navAria')} className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {NAV.map((item) => (
                  <li key={item.key}>
                    <SideLink item={item} label={t(`nav.${item.key}`)} active={isActive(item, pathname)} collapsed={false} />
                  </li>
                ))}
              </ul>

              <div className="my-3 border-t border-border" />

              <ul className="space-y-1">
                <li>
                  <SideLink item={{ href: '/courses', icon: Compass }} label={t('nav.browseCourses')} active={false} collapsed={false} />
                </li>
                <li>
                  <SideLink item={{ href: '/', icon: Home }} label={t('nav.backToSite')} active={false} collapsed={false} />
                </li>
              </ul>
            </nav>

            <form action="/api/auth/logout" method="post" className="border-t border-border p-3">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                {t('shell.signOut')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- content */}
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-300 ease-spring print:!pl-0',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[252px]',
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl print:hidden">
          <div className="flex h-16 items-center gap-2.5 px-4 sm:px-5 lg:px-7">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={t('shell.openMenu')}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <h1 className="truncate font-display text-lg font-extrabold tracking-tight sm:text-xl">
              {title}
            </h1>

            <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 md:block">
              <div className="group relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('shell.searchPlaceholder')}
                  aria-label={t('shell.searchAria')}
                  className="h-10 w-full rounded-xl border border-border bg-muted/60 pl-10 pr-3 text-sm outline-none transition-all duration-300 placeholder:text-muted-foreground/80 focus:border-primary-300 focus:bg-surface focus:ring-4 focus:ring-primary-500/10"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-1.5 md:ml-2">
              <ThemeToggle className="hidden h-10 w-10 sm:grid" />

              {/* ------------------------------------------ notifications */}
              <NotificationBell initialUnread={initialUnread} />

              {/* ------------------------------------------------- account */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenu((v) => !v)}
                  aria-expanded={menu}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl border border-border py-1 pl-1 pr-2 transition-colors hover:border-primary-300"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-fade text-[11px] font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', menu && 'rotate-180')}
                  />
                </button>

                {menu && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-20 w-60 animate-scale-in origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
                  >
                      <div className="border-b border-border bg-muted/50 p-3.5">
                        <p className="truncate text-sm font-bold">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        <MenuLink href="/dashboard/profile" icon={UserIcon}>{t('shell.myProfile')}</MenuLink>
                        <MenuLink href="/dashboard/certificates" icon={Award}>{t('nav.certificates')}</MenuLink>
                        <MenuLink href="/" icon={Home}>{t('nav.backToSite')}</MenuLink>
                      </div>
                      <form action="/api/auth/logout" method="post" className="border-t border-border p-1.5">
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('shell.signOut')}
                        </button>
                      </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* pb-20 clears the mobile tab bar; dropped once it hides at lg. */}
        <main id="main" className="flex-1 px-4 py-6 pb-20 sm:px-5 lg:px-7 lg:pb-10">
          {children}
        </main>
      </div>

      {/* The PWA tab bar the rest of the site uses — kept so mobile navigation
          stays identical inside and outside the dashboard. */}
      <div className="print:hidden">
        <MobileTabBar />
      </div>
    </div>
  )
}

function SideLink({
  item,
  label,
  active,
  collapsed,
}: {
  item: NavItem
  label: string
  active: boolean
  collapsed: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-semibold transition-all duration-300',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-holo-sweep"
        />
      )}
      <Icon className={cn('h-4.5 w-4.5 shrink-0', active && 'text-primary-600 dark:text-primary-300')} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
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
