'use client'

/**
 * Filter surface for `/courses`. Owns no state of its own — the query string is
 * the single source of truth, so a shared link always reproduces the exact view
 * and the server can render the results without any client hand-off.
 *
 * Desktop renders the sidebar; mobile renders a trigger + bottom sheet over the
 * same panel body.
 */

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  SlidersHorizontal, X, ChevronDown, RotateCcw, Search, Loader2,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  COURSE_LEVELS, COURSE_MODES, STREAMS, DURATION_BUCKETS, FEE_BUCKETS,
} from '@/lib/constants'
import {
  RATING_BUCKETS, SORT_OPTIONS, activeFilterCount, courseQueryString, parseCourseFilters,
  type CourseFilterState, type FacetCounts, type MultiFacetKey, type CountedFacetKey,
} from '@/app/(site)/courses/filters'

type Option = { value: string; label: string }
type CountedGroupKey = Extract<MultiFacetKey, CountedFacetKey>

const GROUPS: { key: CountedGroupKey; title: string; options: readonly Option[] }[] = [
  { key: 'level', title: 'Course Level', options: COURSE_LEVELS },
  { key: 'mode', title: 'Delivery Mode', options: COURSE_MODES },
  { key: 'duration', title: 'Duration', options: DURATION_BUCKETS },
  { key: 'fee', title: 'Fees Range', options: FEE_BUCKETS },
]

// --------------------------------------------------------------- url plumbing

/** Reads the live query string back into the same shape the server parsed. */
function useFilterState() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = React.useTransition()

  const state = React.useMemo(() => {
    const raw: Record<string, string | string[]> = {}
    searchParams.forEach((value, key) => {
      const existing = raw[key]
      raw[key] = existing === undefined ? value : ([] as string[]).concat(existing, value)
    })
    return parseCourseFilters(raw)
  }, [searchParams])

  /** Any filter change resets to page 1 — page 7 of the old result set is meaningless. */
  const apply = React.useCallback(
    (next: Partial<CourseFilterState>) => {
      const qs = courseQueryString(state, { page: 1, ...next })
      startTransition(() => router.push(`${pathname}${qs}`, { scroll: false }))
    },
    [pathname, router, state],
  )

  const toggle = React.useCallback(
    (key: MultiFacetKey, value: string) => {
      const current = state[key]
      apply({
        [key]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      } as Partial<CourseFilterState>)
    },
    [apply, state],
  )

  const clearAll = React.useCallback(() => {
    startTransition(() => router.push(pathname, { scroll: false }))
  }, [pathname, router])

  return { state, apply, toggle, clearAll, pending }
}

// ------------------------------------------------------------------ atoms

function OptionRow({
  label, count, checked, radio, onToggle,
}: {
  label: string
  count?: number
  checked: boolean
  radio?: boolean
  onToggle: () => void
}) {
  const empty = count === 0 && !checked

  return (
    <label
      className={cn(
        'flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 py-1.5',
        'transition-colors duration-200 hover:bg-muted',
        empty && 'opacity-45',
      )}
    >
      <Checkbox
        type={radio ? 'radio' : 'checkbox'}
        className={radio ? 'rounded-full' : undefined}
        checked={checked}
        // A radio fires `change` only on the way *in*, so clicking the active
        // threshold to clear it has to be driven from `click` instead.
        {...(radio ? { readOnly: true, onClick: onToggle } : { onChange: onToggle })}
      />
      <span
        className={cn(
          'flex-1 text-[13px] leading-tight transition-colors',
          checked ? 'font-bold text-primary-700 dark:text-primary-300' : 'font-medium',
        )}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </label>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-border last:border-0">
      <summary
        className={cn(
          'flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3',
          'text-[13px] font-bold tracking-tight transition-colors hover:text-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        {title}
        <ChevronDown
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-spring group-open:rotate-180"
        />
      </summary>
      <div className="px-2 pb-3">{children}</div>
    </details>
  )
}

// ------------------------------------------------------------- panel body

function FilterPanelBody({
  counts, state, toggle, apply, clearAll,
}: {
  counts: FacetCounts
  state: CourseFilterState
  toggle: (key: MultiFacetKey, value: string) => void
  apply: (next: Partial<CourseFilterState>) => void
  clearAll: () => void
}) {
  const active = activeFilterCount(state)

  return (
    <div>
      {GROUPS.map((group) => (
        <Group key={group.key} title={group.title}>
          <fieldset>
            <legend className="sr-only">{group.title}</legend>
            {group.options.map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                count={counts[group.key][option.value] ?? 0}
                checked={state[group.key].includes(option.value)}
                onToggle={() => toggle(group.key, option.value)}
              />
            ))}
          </fieldset>
        </Group>
      ))}

      <Group title="Rating">
        <fieldset>
          <legend className="sr-only">Minimum rating</legend>
          {RATING_BUCKETS.map((bucket) => (
            <OptionRow
              key={bucket.value}
              radio
              label={bucket.label}
              count={counts.rating[bucket.value] ?? 0}
              checked={state.rating === bucket.value}
              // Re-picking the active threshold clears it, so a radio group
              // never becomes a one-way door.
              onToggle={() => apply({ rating: state.rating === bucket.value ? '' : bucket.value })}
            />
          ))}
        </fieldset>
      </Group>

      <Group title="Stream">
        <fieldset>
          <legend className="sr-only">Stream</legend>
          {STREAMS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              checked={state.stream.includes(option.value)}
              onToggle={() => toggle('stream', option.value)}
            />
          ))}
        </fieldset>
      </Group>

      <div className="p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={clearAll}
          disabled={active === 0 && !state.q}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear All Filters
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- sidebar

export function CourseFilterSidebar({
  counts,
  className,
}: {
  counts: FacetCounts
  className?: string
}) {
  const { state, apply, toggle, clearAll, pending } = useFilterState()
  const active = activeFilterCount(state)

  return (
    <aside
      aria-label="Refine your search"
      aria-busy={pending}
      className={cn('hidden lg:block', className)}
    >
      <div className="card-base sticky top-24 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
            <SlidersHorizontal aria-hidden className="h-4 w-4 text-primary-600" />
            Refine Your Search
          </h2>
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin text-primary-500" />
          ) : active > 0 ? (
            <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {active}
            </span>
          ) : null}
        </div>

        <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto">
          <FilterPanelBody
            counts={counts}
            state={state}
            toggle={toggle}
            apply={apply}
            clearAll={clearAll}
          />
        </div>
      </div>
    </aside>
  )
}

// ------------------------------------------------------------ mobile sheet

export function CourseFilterDrawer({ counts, total }: { counts: FacetCounts; total: number }) {
  const { state, apply, toggle, clearAll, pending } = useFilterState()
  const [open, setOpen] = React.useState(false)
  const [shown, setShown] = React.useState(false)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const active = activeFilterCount(state)

  // Lock the page behind the sheet and wire Escape while it's up.
  React.useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)

    const raf = requestAnimationFrame(() => {
      setShown(true)
      panelRef.current?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      cancelAnimationFrame(raf)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5',
          'text-[13px] font-bold shadow-soft transition-all duration-300 ease-spring',
          'hover:border-primary-300 hover:shadow-card active:scale-[.98] lg:hidden',
        )}
      >
        <SlidersHorizontal aria-hidden className="h-4 w-4 text-primary-600" />
        Filters
        {active > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
            {active}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className={cn(
              'absolute inset-0 h-full w-full cursor-default bg-slate-950/50 backdrop-blur-sm',
              'transition-opacity duration-300',
              shown ? 'opacity-100' : 'opacity-0',
            )}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Refine your search"
            aria-busy={pending}
            tabIndex={-1}
            style={{ transform: shown ? 'translateY(0)' : 'translateY(100%)' }}
            className={cn(
              'absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-4xl border-t border-border',
              'bg-card shadow-lift outline-none transition-transform duration-300 ease-spring',
            )}
          >
            <div className="shrink-0 border-b border-border px-4 pb-3 pt-2.5">
              <span
                aria-hidden
                className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border"
              />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-extrabold tracking-tight">Refine Your Search</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <FilterPanelBody
                counts={counts}
                state={state}
                toggle={toggle}
                apply={apply}
                clearAll={clearAll}
              />
            </div>

            <div className="safe-bottom shrink-0 border-t border-border bg-card p-4">
              <Button
                type="button"
                variant="holo"
                className="w-full"
                loading={pending}
                onClick={() => setOpen(false)}
              >
                Show {total} {total === 1 ? 'Result' : 'Results'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// -------------------------------------------------------------- sort + search

export function CourseSortSelect() {
  const { state, apply, pending } = useFilterState()

  return (
    <div className="relative">
      <label htmlFor="course-sort" className="sr-only">
        Sort courses
      </label>
      <select
        id="course-sort"
        value={state.sort}
        onChange={(e) => apply({ sort: e.target.value })}
        className={cn(
          'h-10 cursor-pointer appearance-none rounded-xl border border-border bg-card py-0 pl-3.5 pr-9',
          'text-[13px] font-bold shadow-soft transition-all duration-200',
          'hover:border-primary-300 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/12',
        )}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-500"
        />
      ) : (
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      )}
    </div>
  )
}

export function CourseSearchBox({ className }: { className?: string }) {
  const { state, apply, pending } = useFilterState()
  const [draft, setDraft] = React.useState(state.q)

  // Keep the field honest when the query changes from elsewhere (chips, Back).
  React.useEffect(() => setDraft(state.q), [state.q])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        apply({ q: draft.trim() })
      }}
      className={cn('relative flex items-center gap-2', className)}
    >
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search courses, streams or universities…"
          aria-label="Search courses"
          className={cn(
            'h-12 w-full rounded-xl border border-white/25 bg-white/95 pl-11 pr-4 text-sm font-medium text-slate-900',
            'shadow-lift outline-none transition-all duration-200 placeholder:text-slate-400',
            'focus:border-white focus:ring-4 focus:ring-white/25 dark:bg-slate-900/90 dark:text-slate-100',
          )}
        />
      </div>
      <Button type="submit" variant="holo" className="h-12 shrink-0 px-5" loading={pending}>
        Search
      </Button>
    </form>
  )
}

// ------------------------------------------------------------- active chips

const CHIP_LABELS: Record<MultiFacetKey, readonly Option[]> = {
  level: COURSE_LEVELS,
  mode: COURSE_MODES,
  stream: STREAMS,
  duration: DURATION_BUCKETS,
  fee: FEE_BUCKETS,
}

export function ActiveFilterChips() {
  const { state, apply, toggle, clearAll } = useFilterState()

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  if (state.q) {
    chips.push({ key: 'q', label: `“${state.q}”`, onRemove: () => apply({ q: '' }) })
  }

  for (const key of Object.keys(CHIP_LABELS) as MultiFacetKey[]) {
    for (const value of state[key]) {
      const label = CHIP_LABELS[key].find((o) => o.value === value)?.label ?? value
      chips.push({ key: `${key}:${value}`, label, onRemove: () => toggle(key, value) })
    }
  }

  if (state.rating) {
    const label = RATING_BUCKETS.find((b) => b.value === state.rating)?.label ?? state.rating
    chips.push({ key: 'rating', label, onRemove: () => apply({ rating: '' }) })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Active
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className={cn(
            'group inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1',
            'text-[11px] font-bold text-primary-700 transition-all duration-200 hover:border-primary-400 hover:shadow-soft',
            'dark:border-primary-500/30 dark:bg-primary-500/15 dark:text-primary-200',
          )}
        >
          {chip.label}
          <X aria-hidden className="h-3 w-3 transition-transform group-hover:rotate-90" />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="min-h-8 text-[11px] font-bold text-muted-foreground underline-offset-2 transition-colors hover:text-primary-600 hover:underline"
      >
        Clear all
      </button>
    </div>
  )
}
