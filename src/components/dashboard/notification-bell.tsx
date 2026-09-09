'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, GraduationCap, Award, ClipboardList, FolderOpen, Video, Info, CheckCheck, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  url: string | null
  readAt: string | null
  createdAt: string
}

export const NOTIF_ICON: Record<string, React.ElementType> = {
  ENROLMENT: GraduationCap,
  CERTIFICATE: Award,
  TEST: ClipboardList,
  MATERIAL: FolderOpen,
  LIVE: Video,
  ACHIEVEMENT: Flame,
  GENERAL: Info,
}

export function notifTimeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * The dashboard notification bell.
 *
 * Seeded with the server's unread count (so the badge is right on first paint),
 * then owns its own freshness — it reloads on open and on window focus, since the
 * dashboard layout persists across in-app navigation and won't recompute the
 * count on its own. Dismiss is a document listener rather than a rendered
 * backdrop: the header carries backdrop-blur, which would make it the containing
 * block for a fixed overlay and shrink that overlay to the header strip.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const ref = React.useRef<HTMLDivElement>(null)

  const [open, setOpen] = React.useState(false)
  const [unread, setUnread] = React.useState(initialUnread)
  const [items, setItems] = React.useState<NotificationItem[] | null>(null)
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setItems(data.items as NotificationItem[])
        setUnread(data.unreadCount as number)
      }
    } catch {
      /* offline — keep what we have */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  // Refresh when the panel is opened, and close on navigation.
  React.useEffect(() => {
    if (open) load()
  }, [open, load])
  React.useEffect(() => setOpen(false), [pathname])

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function markRead(payload: { id?: string; all?: boolean }) {
    // Optimistic — the bell should feel instant.
    setItems((cur) =>
      cur?.map((n) =>
        payload.all || n.id === payload.id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
      ) ?? cur,
    )
    setUnread((u) => (payload.all ? 0 : Math.max(0, u - 1)))
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const d = await res.json()
        setUnread(d.unreadCount as number)
      }
    } catch {
      /* ignore — a missed read is corrected on next load */
    }
  }

  function openItem(n: NotificationItem) {
    if (!n.readAt) markRead({ id: n.id })
    setOpen(false)
    if (n.url) router.push(n.url)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent-orange px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-[min(22rem,calc(100vw-2rem))] animate-scale-in origin-top-right overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3">
            <p className="text-sm font-bold">
              Notifications{unread > 0 && <span className="ml-1.5 text-primary-600 dark:text-primary-300">{unread} new</span>}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead({ all: true })}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {items === null && loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : items && items.length ? (
            <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
              {items.map((n) => {
                const Icon = NOTIF_ICON[n.type] ?? Info
                const unreadItem = !n.readAt
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                        unreadItem && 'bg-primary-50/50 dark:bg-primary-500/10',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                          unreadItem
                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('text-[13px] leading-snug', unreadItem ? 'font-bold' : 'font-semibold')}>
                            {n.title}
                          </span>
                          {unreadItem && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-orange" aria-hidden />}
                        </span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-muted-foreground/80">{notifTimeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">You&rsquo;re all caught up.</p>
          )}

          <Link
            href="/dashboard/notifications"
            className="block border-t border-border px-4 py-2.5 text-center text-[12.5px] font-semibold text-primary-600 transition-colors hover:bg-muted/60 dark:text-primary-300"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
