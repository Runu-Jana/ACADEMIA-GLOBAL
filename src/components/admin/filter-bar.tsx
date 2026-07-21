'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Select } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export type FilterSelect = {
  name: string
  label: string
  options: { value: string; label: string }[]
}

/**
 * Query-string driven filter bar. Current values arrive as plain props from the
 * server page (rather than `useSearchParams`) so this never needs a Suspense
 * boundary and stays trivially serialisable.
 */
export function FilterBar({
  basePath,
  values,
  selects = [],
  searchName = 'q',
  searchPlaceholder = 'Search…',
  className,
}: {
  basePath: string
  values: Record<string, string>
  selects?: FilterSelect[]
  searchName?: string
  searchPlaceholder?: string
  className?: string
}) {
  const router = useRouter()
  const [term, setTerm] = React.useState(values[searchName] ?? '')
  const [pending, startTransition] = React.useTransition()

  // Keep the input in sync when the server re-renders with different params.
  React.useEffect(() => {
    setTerm(values[searchName] ?? '')
  }, [values, searchName])

  const push = React.useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(next)) {
        if (v && v.trim()) params.set(k, v.trim())
      }
      const qs = params.toString()
      startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath))
    },
    [basePath, router],
  )

  // Debounce free-text so we don't navigate on every keystroke.
  const debounced = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function onSearchChange(value: string) {
    setTerm(value)
    if (debounced.current) clearTimeout(debounced.current)
    debounced.current = setTimeout(() => push({ ...values, [searchName]: value }), 350)
  }

  React.useEffect(() => {
    return () => {
      if (debounced.current) clearTimeout(debounced.current)
    }
  }, [])

  const active = Object.entries(values).filter(([, v]) => v).length > 0

  return (
    <div className={cn('card-base mb-4 p-3', className)}>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (debounced.current) clearTimeout(debounced.current)
            push({ ...values, [searchName]: term })
          }}
          className="relative min-w-0 flex-1"
          role="search"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-input bg-surface pl-10 pr-9 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10"
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm('')
                if (debounced.current) clearTimeout(debounced.current)
                push({ ...values, [searchName]: '' })
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {selects.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />
            {selects.map((s) => (
              <Select
                key={s.name}
                aria-label={s.label}
                value={values[s.name] ?? ''}
                onChange={(e) => push({ ...values, [s.name]: e.target.value })}
                className="h-10 w-full text-[13px] sm:w-auto sm:min-w-[9.5rem]"
              >
                <option value="">{s.label}</option>
                {s.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ))}
          </div>
        )}

        {active && (
          <button
            type="button"
            onClick={() => push({})}
            className="h-10 shrink-0 rounded-xl border border-border px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600"
          >
            Reset
          </button>
        )}
      </div>

      {pending && (
        <span className="sr-only" role="status">
          Loading results
        </span>
      )}
    </div>
  )
}
