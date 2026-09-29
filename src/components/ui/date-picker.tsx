'use client'

import * as React from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectMenu } from './select-menu'

/**
 * A fully themed date picker with a value contract identical to a native
 * <input type="date"> ("YYYY-MM-DD"), so it drops in wherever one was used.
 *
 * Native date inputs render an OS calendar popup that can't be styled; this
 * uses a custom calendar with month/year quick-jump (handy for dates of birth)
 * that matches the app's surface, radius and colours.
 */

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseISO(v: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!match) return null
  const y = +match[1]
  const m = +match[2] - 1
  const d = +match[3]
  const dt = new Date(y, m, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null
  return { y, m, d }
}

const MONTHS = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2020, m, 1)),
)
// 2023-01-01 is a Sunday — build localized short weekday names starting Sunday
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2023, 0, 1 + i)),
)

const fmtLong = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  className,
  buttonClassName,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** ISO "YYYY-MM-DD" bounds (inclusive). */
  min?: string
  max?: string
  className?: string
  buttonClassName?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const selected = parseISO(value)
  const today = new Date()
  const init = selected ?? parseISO(max ?? '') ?? { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() }
  const [view, setView] = React.useState({ y: init.y, m: init.m })

  // when the popover opens, jump the view to the selected month (or today)
  React.useEffect(() => {
    if (open) {
      const base = selected ?? { y: today.getFullYear(), m: today.getMonth() }
      setView({ y: base.y, m: base.m })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const minP = parseISO(min ?? '')
  const maxP = parseISO(max ?? '')
  const minTime = minP ? new Date(minP.y, minP.m, minP.d).getTime() : -Infinity
  const maxTime = maxP ? new Date(maxP.y, maxP.m, maxP.d).getTime() : Infinity

  const fromYear = minP ? minP.y : (maxP ? maxP.y : today.getFullYear()) - 100
  const toYear = maxP ? maxP.y : today.getFullYear() + 10
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => toYear - i)

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const firstWeekday = new Date(view.y, view.m, 1).getDay()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const shift = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const pick = (d: number) => {
    onChange(toISO(view.y, view.m, d))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground shadow-sm',
          'transition-all duration-200 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/12',
          buttonClassName,
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? fmtLong.format(new Date(selected.y, selected.m, selected.d)) : placeholder}
        </span>
        <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3 shadow-lg animate-fade-up"
        >
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shift(-1)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 gap-1.5">
              <SelectMenu
                value={String(view.m)}
                onChange={(v) => setView((s) => ({ ...s, m: +v }))}
                options={MONTHS.map((label, i) => ({ value: String(i), label }))}
                aria-label="Month"
                className="flex-1"
                buttonClassName="h-8 px-2.5 text-[13px]"
              />
              <SelectMenu
                value={String(view.y)}
                onChange={(v) => setView((s) => ({ ...s, y: +v }))}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
                aria-label="Year"
                className="w-[5.5rem] shrink-0"
                buttonClassName="h-8 px-2.5 text-[13px]"
              />
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shift(1)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-semibold text-muted-foreground">
                {w.slice(0, 2)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d == null) return <div key={`e${i}`} />
              const time = new Date(view.y, view.m, d).getTime()
              const disabled = time < minTime || time > maxTime
              const isSelected = !!selected && selected.y === view.y && selected.m === view.m && selected.d === d
              const isToday =
                today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  aria-current={isToday ? 'date' : undefined}
                  className={cn(
                    'grid h-9 place-items-center rounded-lg text-sm transition-colors',
                    disabled && 'cursor-not-allowed text-muted-foreground/40',
                    !disabled && !isSelected && 'text-foreground hover:bg-muted',
                    isSelected && 'bg-primary-600 font-semibold text-white',
                    !isSelected && isToday && 'ring-1 ring-inset ring-primary-400',
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
