'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, List, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Enrolment-specific controls that live alongside the search/status/course
 * FilterBar: an enrolled-date range and a "group by course" view toggle. Both
 * push to the query string, preserving the other filters (spread from `values`).
 */
export function EnrolmentToolbar({
  values,
  basePath = '/admin/enrolments',
}: {
  values: Record<string, string>
  basePath?: string
}) {
  const router = useRouter()
  const [, startTransition] = React.useTransition()

  const push = React.useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(next)) if (v && v.trim()) params.set(k, v.trim())
      const qs = params.toString()
      startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath))
    },
    [basePath, router],
  )

  const grouped = values.view === 'grouped'
  const dateInput =
    'h-9 rounded-lg border border-input bg-surface px-2.5 text-[13px] tabular-nums outline-none focus:border-primary-400'

  return (
    <div className="card-base mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-primary-500" />
          Enrolled
        </span>
        <input
          type="date"
          value={values.from ?? ''}
          max={values.to || undefined}
          onChange={(e) => push({ ...values, from: e.target.value })}
          aria-label="Enrolled from"
          className={dateInput}
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          value={values.to ?? ''}
          min={values.from || undefined}
          onChange={(e) => push({ ...values, to: e.target.value })}
          aria-label="Enrolled to"
          className={dateInput}
        />
        {(values.from || values.to) && (
          <button
            type="button"
            onClick={() => push({ ...values, from: '', to: '' })}
            className="text-[12px] font-semibold text-muted-foreground underline-offset-2 hover:text-primary-600 hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      <div className="inline-flex shrink-0 rounded-xl border border-border bg-muted/50 p-0.5">
        <button
          type="button"
          onClick={() => push({ ...values, view: '' })}
          aria-pressed={!grouped}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors',
            !grouped ? 'bg-card text-primary-700 shadow-soft dark:text-primary-300' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <List className="h-3.5 w-3.5" />
          List
        </button>
        <button
          type="button"
          onClick={() => push({ ...values, view: 'grouped' })}
          aria-pressed={grouped}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors',
            grouped ? 'bg-card text-primary-700 shadow-soft dark:text-primary-300' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Group by course
        </button>
      </div>
    </div>
  )
}
