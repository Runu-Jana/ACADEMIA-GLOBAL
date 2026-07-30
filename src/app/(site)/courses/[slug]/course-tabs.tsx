'use client'

import * as React from 'react'
import {
  BookOpen, ListChecks, IndianRupee, ShieldCheck, Building2, Briefcase, MessageSquare, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Panels arrive fully rendered from the server, so this only owns which one is
 * visible. Icons are resolved from the tab id here rather than passed in —
 * a component reference can't cross the server/client boundary.
 */
const ICONS: Record<string, React.ElementType> = {
  overview: BookOpen,
  syllabus: ListChecks,
  fees: IndianRupee,
  eligibility: ShieldCheck,
  university: Building2,
  placements: Briefcase,
  reviews: MessageSquare,
  faqs: HelpCircle,
}

export type TabItem = { id: string; label: string; content: React.ReactNode }

export function CourseTabs({ tabs }: { tabs: TabItem[] }) {
  const [active, setActive] = React.useState(tabs[0]?.id ?? '')
  const listRef = React.useRef<HTMLDivElement>(null)
  const ids = tabs.map((t) => t.id).join(',')

  // Fade a tab-strip edge only when tabs are actually scrolled off in that
  // direction. On desktop the whole strip fits, so neither edge fades and the
  // active first/last tab keeps its solid pill — the old static mask showed the
  // page background through the leftmost tab (white in light, black in dark).
  const [fade, setFade] = React.useState({ left: false, right: false })

  // `#syllabus` style deep links, kept in sync with Back/Forward.
  React.useEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1)
      if (id && ids.split(',').includes(id)) setActive(id)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [ids])

  // Recompute which edges have off-screen tabs on scroll and resize.
  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    const update = () => {
      const overflowing = el.scrollWidth > el.clientWidth + 1
      setFade({
        left: overflowing && el.scrollLeft > 1,
        right: overflowing && el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ids])

  const select = React.useCallback((id: string) => {
    setActive(id)
    // replaceState instead of assigning location.hash: no scroll jump.
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === active)
    let next = -1

    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return

    e.preventDefault()
    const id = tabs[next].id
    select(id)
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)?.focus()
  }

  // Only fade the edges that actually have hidden tabs; no fade ⇒ no mask, so
  // the active pill is never shown-through.
  const maskImage =
    fade.left || fade.right
      ? `linear-gradient(90deg, ${fade.left ? 'transparent, #000 28px' : '#000 0'}, ${
          fade.right ? '#000 calc(100% - 28px), transparent' : '#000 100%'
        })`
      : undefined

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-5 bg-background/85 px-4 backdrop-blur-md lg:top-[68px]">
        <div
          ref={listRef}
          role="tablist"
          aria-label="Course details"
          onKeyDown={onKeyDown}
          className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border py-2"
          style={maskImage ? { WebkitMaskImage: maskImage, maskImage } : undefined}
        >
          {tabs.map((tab) => {
            const Icon = ICONS[tab.id] ?? BookOpen
            const isActive = tab.id === active

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                data-tab-id={tab.id}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(tab.id)}
                className={cn(
                  'relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5',
                  'text-[13px] font-bold transition-all duration-300 ease-spring',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive
                    ? 'bg-primary-600 text-white shadow-glow'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon aria-hidden className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="animate-fade-up focus-visible:outline-none"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
