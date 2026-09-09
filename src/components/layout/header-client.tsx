'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot, GitCompare, ShoppingCart, Menu, X, ChevronDown, LogOut,
  LayoutDashboard, GraduationCap, User as UserIcon, Shield,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Logo } from './logo'
import { SearchBox } from './search-box'
import { ThemeToggle } from './theme-toggle'
import { LocaleSwitcher } from './locale-switcher'
import { buttonVariants } from '@/components/ui/button'
import { useCompare } from '@/lib/use-compare'
import { useCart } from '@/lib/use-cart'
import { useMountTransition } from '@/lib/use-mount-transition'
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
  { label: 'Shop', href: '/shop' },
]

/** Maps each top-level nav item to its `nav.*` message key. Kept beside NAV so
 *  the item's `label` stays the stable identifier for open/active state. */
const NAV_KEYS: Record<string, string> = {
  'Online Degrees': 'onlineDegrees',
  'Distance Degrees': 'distanceDegrees',
  'Regular Degrees': 'regularDegrees',
  'Part-Time Courses': 'partTimeCourses',
  Universities: 'universities',
  Exams: 'exams',
  Scholarships: 'scholarships',
  Shop: 'shop',
}

export function HeaderClient({ user }: { user: HeaderUser }) {
  const pathname = usePathname()
  const tn = useTranslations('nav')
  const th = useTranslations('header')
  const { count } = useCompare()
  const { count: cartCount, ready: cartReady } = useCart()

  const [scrolled, setScrolled] = React.useState(false)
  const [drawer, setDrawer] = React.useState(false)
  // Keeps the panel mounted while it slides back out.
  const { mounted: drawerMounted, visible: drawerVisible } = useMountTransition(drawer)
  const [menu, setMenu] = React.useState(false)
  // The account dropdown is dismissed via a document listener bound to this ref,
  // not a rendered backdrop: a scrolled header gains backdrop-blur, and
  // backdrop-filter makes the header the containing block for fixed children, so
  // a "full-screen" fixed catcher only ever covered the header strip.
  const userMenuRef = React.useRef<HTMLDivElement>(null)
  // The mega-nav dropdown is JS-controlled, not CSS :hover — it opens only on a
  // fresh pointer-enter/focus and is set to null on click or navigation. That way
  // clicking a category closes it immediately, and a cursor left sitting over the
  // (now-closed) panel can't reopen it, since reopening needs a new enter event.
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)

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
    setOpenMenu(null)
  }, [pathname])

  React.useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  // Escape closes the drawer. Without it the only ways out were the X and the
  // backdrop, which leaves a keyboard user stuck behind a full-screen overlay.
  React.useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  // Dismiss the account dropdown on an outside pointer-down or Escape. Bound to
  // the document rather than a rendered backdrop so a scrolled, blurred header
  // can't shrink the click target to its own height (see userMenuRef).
  React.useEffect(() => {
    if (!menu) return
    const onPointerDown = (e: PointerEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setMenu(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  // ----------------------------------------------------------- active nav
  // A destination is "active" when the current path is it, or nested under it,
  // so the header reflects where the visitor actually is. The four course
  // mega-menus differ only by query string (?mode=…), which a layout-level
  // client header can't read without opting the whole app into client
  // rendering — so they keep their dropdown affordance rather than a path
  // match that would light all four at once.
  const isActive = React.useCallback(
    (href: string) => {
      const path = href.split('?')[0]
      if (path === '/shop') {
        // The listing and product pages light up Shop; the cart and checkout
        // pages belong to the Cart button, so Shop yields to it there.
        if (pathname === '/shop') return true
        return (
          pathname.startsWith('/shop/') &&
          !pathname.startsWith('/shop/cart') &&
          !pathname.startsWith('/shop/checkout')
        )
      }
      return pathname === path || pathname.startsWith(`${path}/`)
    },
    [pathname],
  )
  // The Cart button owns the whole basket → checkout flow.
  const cartActive = pathname.startsWith('/shop/cart') || pathname.startsWith('/shop/checkout')

  // Persistent "you are here" styling, shaped to each element it lands on.
  // Buttons take a solid fill in the brand blue (primary-600, the same shade as
  // the Sign Up and search buttons); the tab-style mega-nav keeps that blue as
  // text + an underline, the right idiom for a horizontal bar. hover:bg-primary-700
  // is set so an already-active button stays blue on hover instead of falling
  // back to the neutral hover the base class carries.
  const navPillActive = 'bg-primary-600 text-white hover:bg-primary-700'
  const navBarActive =
    "text-primary-600 dark:text-primary-300 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary-600 after:content-[''] dark:after:bg-primary-300"
  const drawerLinkActive = 'bg-primary-600 text-white'

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

          <SearchBox variant="bar" className="ml-auto hidden max-w-md flex-1 md:block lg:ml-6" />

          <div className="ml-auto flex items-center gap-1.5 md:ml-3">
            <Link
              href="/counsellor"
              aria-current={isActive('/counsellor') ? 'page' : undefined}
              className={cn(
                'hidden items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted xl:inline-flex',
                isActive('/counsellor') && navPillActive,
              )}
            >
              <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-holo-sweep">
                <Bot className="h-4 w-4 text-white" />
              </span>
              {th('askSarthi')}
            </Link>

            <Link
              href="/compare"
              aria-current={isActive('/compare') ? 'page' : undefined}
              className={cn(
                'relative hidden items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted lg:inline-flex',
                isActive('/compare') && navPillActive,
              )}
            >
              <GitCompare className={cn('h-4 w-4', isActive('/compare') ? 'text-white' : 'text-primary-600')} />
              {th('compare')}
              {count > 0 && (
                <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent-orange px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            {/* Cart stays visible at every breakpoint — a shopper who can't
                find their basket abandons it. */}
            <Link
              href="/shop/cart"
              aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
              aria-current={cartActive ? 'page' : undefined}
              className={cn(
                'relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted',
                cartActive && navPillActive,
              )}
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              {cartReady && cartCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-orange px-1 text-[10px] font-bold leading-none text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            <LocaleSwitcher className="hidden sm:block" />
            <ThemeToggle className="hidden sm:grid" />

            {user ? (
              <div className="relative" ref={userMenuRef}>
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
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'hidden sm:inline-flex' })}>
                  {th('login')}
                </Link>
                <Link href="/signup" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                  {th('signUp')}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- mega nav */}
        <nav aria-label="Course categories" className="hidden border-t border-border lg:block">
          <ul className="container flex items-center gap-1">
            {NAV.map((item) => {
              const open = openMenu === item.label
              // Course items differ only by ?mode=…; leave those to the dropdown.
              const active = !item.columns && isActive(item.href)
              return (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => item.columns && setOpenMenu(item.label)}
                  onMouseLeave={() => setOpenMenu((cur) => (cur === item.label ? null : cur))}
                  onFocus={() => item.columns && setOpenMenu(item.label)}
                  onBlur={(e) => {
                    // Only close if focus left this item entirely (keyboard nav out).
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setOpenMenu((cur) => (cur === item.label ? null : cur))
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      setOpenMenu(null)
                      e.currentTarget.blur()
                    }}
                    aria-expanded={item.columns ? open : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-1 px-3 py-3 text-[13px] font-semibold text-foreground/85 transition-colors hover:text-primary-600',
                      open && 'text-primary-600',
                      active && navBarActive,
                    )}
                  >
                    {tn(NAV_KEYS[item.label])}
                    {item.columns && (
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', open && 'rotate-180')} />
                    )}
                  </Link>

                  {item.columns && (
                    <div
                      className={cn(
                        'absolute left-0 top-full z-30 transition-all duration-300 ease-spring',
                        open
                          ? 'visible translate-y-0 opacity-100'
                          : 'invisible translate-y-2 pointer-events-none opacity-0',
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
                                      setOpenMenu(null)
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
              )
            })}
            <li className="relative ml-auto">
              <Link
                href="/verify"
                aria-current={isActive('/verify') ? 'page' : undefined}
                className={cn(
                  'relative px-3 py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-primary-600',
                  isActive('/verify') && navBarActive,
                )}
              >
                {tn('verifyCertificate')}
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      {/* ------------------------------------------------------ mobile drawer */}
      {drawerMounted && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* A real <button>, not a div with onClick: iOS Safari does not
              reliably fire click on a plain non-interactive element, which is the
              classic reason a tap-outside-to-close backdrop works everywhere
              except on an iPhone. Also gives it keyboard and AT semantics. */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className={cn(
              'absolute inset-0 h-full w-full cursor-pointer bg-slate-950/55 backdrop-blur-sm',
              'transition-opacity duration-300 ease-spring will-change-[opacity]',
              drawerVisible ? 'opacity-100' : 'opacity-0',
            )}
          />
          {/* Close on any link tap, immediately.
              The pathname effect below is a backstop, not the mechanism: it only
              fires once the new route has committed, and in dev that wait is a
              full on-demand compile — so the drawer sat open over the page the
              user had already navigated to. It also never fired at all when the
              link pointed at the current route. */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a')) setDrawer(false)
            }}
            className={cn(
              'absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-background shadow-2xl',
              'transition-transform duration-300 ease-spring will-change-transform',
              drawerVisible ? 'translate-x-0' : '-translate-x-full',
            )}
          >
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
              <SearchBox variant="drawer" onNavigate={() => setDrawer(false)} />
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              {NAV.map((item) =>
                // A top-level entry with no sub-columns (Universities, Exams,
                // Scholarships, Shop) is a destination, not a disclosure. It used
                // to render as a <summary> regardless, so `item.href` was never
                // used and tapping it silently toggled an empty <details>.
                item.columns ? (
                  <details key={item.label} className="group border-b border-border/70 last:border-0">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-2 py-3 text-sm font-semibold marker:hidden">
                      {tn(NAV_KEYS[item.label])}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pb-2">
                      {/* The section itself is still reachable — expanding it
                          shouldn't hide the way to the full listing. */}
                      <Link
                        href={item.href}
                        className="block rounded-lg px-4 py-2 text-[13px] font-bold text-primary-600 transition-colors hover:bg-muted dark:text-primary-300"
                      >
                        All {tn(NAV_KEYS[item.label])}
                      </Link>
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
                  </details>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center border-b border-border/70 px-2 py-3 text-sm font-semibold last:border-0',
                      isActive(item.href) && 'text-primary-600 dark:text-primary-300',
                    )}
                  >
                    {tn(NAV_KEYS[item.label])}
                  </Link>
                ),
              )}

              <div className="mt-3 space-y-1 border-t border-border pt-3">
                <Link href="/counsellor" aria-current={isActive('/counsellor') ? 'page' : undefined} className={cn('block rounded-lg px-2 py-2.5 text-sm font-semibold', isActive('/counsellor') && drawerLinkActive)}>{th('askSarthi')}</Link>
                <Link href="/compare" aria-current={isActive('/compare') ? 'page' : undefined} className={cn('block rounded-lg px-2 py-2.5 text-sm font-semibold', isActive('/compare') && drawerLinkActive)}>Compare Courses {count > 0 && `(${count})`}</Link>
                <Link href="/shop" aria-current={isActive('/shop') ? 'page' : undefined} className={cn('block rounded-lg px-2 py-2.5 text-sm font-semibold', isActive('/shop') && drawerLinkActive)}>Student Shop</Link>
                <Link href="/shop/cart" aria-current={cartActive ? 'page' : undefined} className={cn('block rounded-lg px-2 py-2.5 text-sm font-semibold', cartActive && drawerLinkActive)}>Cart {cartReady && cartCount > 0 && `(${cartCount})`}</Link>
                <Link href="/verify" aria-current={isActive('/verify') ? 'page' : undefined} className={cn('block rounded-lg px-2 py-2.5 text-sm font-semibold', isActive('/verify') && drawerLinkActive)}>{tn('verifyCertificate')}</Link>
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
