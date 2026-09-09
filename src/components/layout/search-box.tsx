'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Search, Loader2, GraduationCap, Building2, ShoppingBag, ScrollText, CornerDownLeft, ArrowRight,
} from 'lucide-react'
import type { SearchResults } from '@/lib/search'
import { cn } from '@/lib/utils'

// Kept in step with MIN_QUERY in lib/search.ts — redeclared here rather than
// imported so this client bundle never pulls in the server-only search module.
const MIN_QUERY = 2

type FlatItem = {
  href: string
  label: string
  sublabel: string
}

type Group = {
  key: 'courses' | 'universities' | 'products' | 'exams'
  label: string
  icon: React.ElementType
  items: FlatItem[]
}

function buildGroups(r: SearchResults): Group[] {
  const groups: Group[] = [
    {
      key: 'courses',
      label: 'Courses',
      icon: GraduationCap,
      items: r.courses.map((c) => ({
        href: `/courses/${c.slug}`,
        label: c.title,
        sublabel: c.university.name,
      })),
    },
    {
      key: 'universities',
      label: 'Universities',
      icon: Building2,
      items: r.universities.map((u) => ({
        href: `/universities/${u.slug}`,
        label: u.name,
        sublabel: `${u.city}, ${u.state}`,
      })),
    },
    {
      key: 'products',
      label: 'Shop',
      icon: ShoppingBag,
      items: r.products.map((p) => ({
        href: `/shop/${p.slug}`,
        label: p.title,
        sublabel: p.author ?? p.brand ?? p.subtitle,
      })),
    },
    {
      key: 'exams',
      label: 'Exams',
      icon: ScrollText,
      items: r.exams.map((e) => ({
        href: `/exams#exam-${e.slug}`,
        label: e.name,
        sublabel: e.category,
      })),
    },
  ]
  return groups.filter((g) => g.items.length > 0)
}

/**
 * The universal search box with an instant typeahead dropdown. Matches across
 * courses, universities, shop products and exams as the visitor types, and
 * Enter (or "See all results") lands on the full `/search` page.
 *
 * Used both in the desktop header bar and the mobile drawer; `onNavigate` lets
 * the drawer close itself the moment a result is chosen, without waiting on the
 * route to commit.
 */
export function SearchBox({
  variant = 'bar',
  className,
  onNavigate,
  initialQuery,
}: {
  variant?: 'bar' | 'drawer'
  className?: string
  onNavigate?: () => void
  /** Prefills the box — used on the /search results page so the query stays visible. */
  initialQuery?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const th = useTranslations('header')

  const [q, setQ] = React.useState(initialQuery ?? '')
  const [results, setResults] = React.useState<SearchResults | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1) // -1 = input itself, no row highlighted

  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  const trimmed = q.trim()
  const ready = trimmed.length >= MIN_QUERY

  // Flatten the grouped results into the keyboard navigation order, then append
  // the synthetic "See all results" row so ↓ reaches it too.
  const groups = React.useMemo(() => (results ? buildGroups(results) : []), [results])
  const seeAllHref = `/search?q=${encodeURIComponent(trimmed)}`
  const flat = React.useMemo<FlatItem[]>(() => {
    const items = groups.flatMap((g) => g.items)
    if (ready) items.push({ href: seeAllHref, label: `See all results for "${trimmed}"`, sublabel: '' })
    return items
  }, [groups, ready, seeAllHref, trimmed])

  // Debounced fetch. An AbortController cancels the in-flight request on every
  // keystroke so a slow early response can't overwrite a newer one.
  React.useEffect(() => {
    if (!ready) {
      setResults(null)
      setLoading(false)
      abortRef.current?.abort()
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    abortRef.current?.abort()
    abortRef.current = ctrl
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error('search failed')
        const data: SearchResults = await res.json()
        setResults(data)
        setActive(-1)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setResults(null)
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 180)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [trimmed, ready])

  // Dismiss on an outside pointer-down (same approach as the account menu: a
  // document listener, not a rendered backdrop).
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Any navigation closes the panel.
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Closing/notifying after a result is chosen. A clicked <Link> navigates on
  // its own, so its handler only needs this; keyboard Enter and the submit
  // button have no Link to ride on, so they call `go`, which also pushes.
  function closeAfter() {
    setOpen(false)
    setActive(-1)
    onNavigate?.()
  }

  function go(href: string) {
    closeAfter()
    router.push(href)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (active >= 0 && flat[active]) return go(flat[active].href)
    if (ready) return go(seeAllHref)
    go('/courses')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && ready) setOpen(true)
      setActive((i) => Math.min(flat.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(-1, i - 1))
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
        setActive(-1)
      }
    }
  }

  const showPanel = open && ready
  const noMatches = showPanel && !loading && results !== null && results.total === 0

  let runningIndex = -1 // global row index as we render group by group

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <form onSubmit={onSubmit} role="search">
        <div className="group relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={th('searchPlaceholder')}
            aria-label="Search"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls="site-search-panel"
            aria-autocomplete="list"
            autoComplete="off"
            className={cn(
              'w-full rounded-xl border border-border bg-muted/60 pl-10 text-sm outline-none transition-all duration-300 placeholder:text-muted-foreground/80 focus:border-primary-300 focus:bg-surface focus:ring-4 focus:ring-primary-500/10',
              variant === 'drawer' ? 'h-11 pr-3' : 'h-10 pr-10',
            )}
          />
          {variant === 'bar' && (
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 grid h-7 w-9 -translate-y-1/2 place-items-center rounded-lg bg-primary-600 text-white transition-colors hover:bg-primary-700"
              aria-label="Search"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </form>

      {showPanel && (
        <div
          id="site-search-panel"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-1.5 shadow-lift"
        >
          {loading && !results && (
            <div className="flex items-center gap-2 px-3 py-6 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {noMatches && (
            <div className="px-3 py-6 text-center">
              <p className="text-[13px] font-semibold">No matches for “{trimmed}”</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Try a course, university, book or exam name.
              </p>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.key} className="mb-1 last:mb-0">
              <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                <g.icon className="h-3 w-3" />
                {g.label}
              </p>
              {g.items.map((item) => {
                runningIndex += 1
                const idx = runningIndex
                return (
                  <Link
                    key={`${g.key}-${item.href}`}
                    href={item.href}
                    role="option"
                    aria-selected={active === idx}
                    onClick={closeAfter}
                    onMouseEnter={() => setActive(idx)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                      active === idx ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-muted',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-foreground">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-[11.5px] text-muted-foreground">{item.sublabel}</span>
                      )}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}

          {ready && (results?.total ?? 0) > 0 && (() => {
            runningIndex += 1
            const idx = runningIndex
            return (
              <Link
                href={seeAllHref}
                role="option"
                aria-selected={active === idx}
                onClick={closeAfter}
                onMouseEnter={() => setActive(idx)}
                className={cn(
                  'mt-1 flex items-center gap-2 rounded-lg border-t border-border px-2.5 py-2.5 text-[13px] font-bold text-primary-600 transition-colors dark:text-primary-300',
                  active === idx ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-muted',
                )}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                See all results for “{trimmed}”
                <CornerDownLeft className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            )
          })()}
        </div>
      )}
    </div>
  )
}
