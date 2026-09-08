'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, BellOff, Info } from 'lucide-react'
import { NOTIF_ICON, notifTimeAgo, type NotificationItem } from './notification-bell'
import { cn } from '@/lib/utils'

/** The full notifications list at /dashboard/notifications. */
export function NotificationInbox({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter()
  const [items, setItems] = React.useState(initial)
  const unread = items.filter((n) => !n.readAt).length

  async function markRead(payload: { id?: string; all?: boolean }) {
    setItems((cur) =>
      cur.map((n) =>
        payload.all || n.id === payload.id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
      ),
    )
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      /* a missed read reconciles on next load */
    }
  }

  function openItem(n: NotificationItem) {
    if (!n.readAt) markRead({ id: n.id })
    if (n.url) router.push(n.url)
  }

  if (items.length === 0) {
    return (
      <div className="card-base grid place-items-center px-6 py-16 text-center">
        <BellOff aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-[15px] font-bold">No notifications yet</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
          Enrolments, graded tests, new material and certificates will show up here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">
          {unread > 0 ? `${unread} unread` : 'All caught up'}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markRead({ all: true })}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-300"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((n) => {
          const Icon = NOTIF_ICON[n.type] ?? Info
          const isUnread = !n.readAt
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => openItem(n)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                  isUnread
                    ? 'border-primary-200 bg-primary-50/50 hover:bg-primary-50 dark:border-primary-500/30 dark:bg-primary-500/10'
                    : 'border-border bg-surface hover:bg-muted/50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                    isUnread
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn('text-[14px] leading-snug', isUnread ? 'font-bold' : 'font-semibold')}>
                      {n.title}
                    </span>
                    {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-orange" aria-hidden />}
                  </span>
                  {n.body && <span className="mt-0.5 block text-[13px] text-muted-foreground">{n.body}</span>}
                  <span className="mt-1 block text-[11.5px] text-muted-foreground/80">{notifTimeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
