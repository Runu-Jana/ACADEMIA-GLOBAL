'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Bot, GraduationCap, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/courses', label: 'Courses', icon: Compass },
  { href: '/counsellor', label: 'Saarthi', icon: Bot, accent: true },
  { href: '/dashboard/learn', label: 'Learn', icon: GraduationCap },
  { href: '/dashboard', label: 'Account', icon: User, exact: true },
]

/**
 * Bottom tab bar — gives the installed PWA a native feel on phones.
 * Hidden from large screens, where the header nav takes over.
 */
export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, exact, accent }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
                  active ? 'text-primary-600 dark:text-primary-300' : 'text-muted-foreground',
                )}
              >
                {active && (
                  <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-holo-sweep" />
                )}
                <span
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-lg transition-all duration-300',
                    accent && 'bg-holo-sweep text-white shadow-glow',
                    active && !accent && 'bg-primary-50 dark:bg-primary-500/15',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
