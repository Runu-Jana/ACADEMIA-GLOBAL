'use client'

import * as React from 'react'
import { Building2, BadgeCheck, GraduationCap, MessageSquare, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Same contract as the course tabs: panels arrive pre-rendered from the server,
 * icons are resolved from the tab id so no component reference has to cross the
 * server/client boundary.
 */
const ICONS: Record<string, React.ElementType> = {
  about: Building2,
  accreditation: BadgeCheck,
  programs: GraduationCap,
  reviews: MessageSquare,
  contact: Phone,
}

export type UniversityTabItem = { id: string; label: string; content: React.ReactNode }

export function UniversityTabs({ tabs }: { tabs: UniversityTabItem[] }) {
  const [active, setActive] = React.useState(tabs[0]?.id ?? '')
  const listRef = React.useRef<HTMLDivElement>(null)
  const ids = tabs.map((t) => t.id).join(',')

  React.useEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1)
      if (id && ids.split(',').includes(id)) setActive(id)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [ids])

  const select = React.useCallback((id: string) => {
    setActive(id)
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

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-6 bg-background/85 px-4 backdrop-blur-md lg:top-[68px]">
        <div
          ref={listRef}
          role="tablist"
          aria-label="University profile sections"
          onKeyDown={onKeyDown}
          className="no-scrollbar mask-fade-x flex gap-1 overflow-x-auto border-b border-border py-2"
        >
          {tabs.map((tab) => {
            const Icon = ICONS[tab.id] ?? Building2
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
