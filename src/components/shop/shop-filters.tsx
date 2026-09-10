'use client'

/**
 * Filter surface for `/shop`. Owns no state of its own — the query string is the
 * single source of truth, so a shared link reproduces the exact shelf and the
 * server renders results with no client hand-off. Same contract as the course
 * filters; desktop gets the sidebar, mobile gets a bottom sheet over the same body.
 */

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SlidersHorizontal, X, ChevronDown, RotateCcw, Search, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PRODUCT_KINDS, SHOP_CATEGORIES, EXAM_TAGS, PRICE_BUCKETS } from '@/lib/shop'
import {
  parseShopFilters, shopQueryString, toggled, type ShopFilterState,
} from '@/app/(site)/shop/filters'

export type ShopFacetCounts = {
  kind: Record<string, number>
  category: Record<string, number>
  price: Record<string, number>
}

const SORT_VALUES = ['relevance', 'price-asc', 'price-desc', 'rating', 'newest'] as const

type MultiKey = 'kind' | 'category' | 'exam' | 'price'

function activeCount(s: ShopFilterState): number {
  return s.kind.length + s.category.length + s.exam.length + s.price.length + (s.inStock ? 1 : 0)
}

/* ------------------------------------------------------------ url plumbing */

function useShopUrl() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = React.useTransition()

  const state = React.useMemo(
    () => parseShopFilters(Object.fromEntries(params.entries())),
    [params],
  )

  // Any filter change resets to page 1 — staying on page 4 of a narrower result
  // set is the classic way to land a user on an empty grid.
  const apply = React.useCallback(
    (next: Partial<ShopFilterState>) => {
      const qs = shopQueryString(state, { ...next, page: 1 })
      start(() => router.push(`${pathname}${qs}`, { scroll: false }))
    },
    [pathname, router, state],
  )

  const toggle = React.useCallback(
    (key: MultiKey, value: string) => apply({ [key]: toggled(state[key], value) }),
    [apply, state],
  )

  const clearAll = React.useCallback(() => {
    start(() => router.push(pathname, { scroll: false }))
  }, [pathname, router])

  return { state, apply, toggle, clearAll, pending }
}

/* ---------------------------------------------------------------- pieces */

function OptionRow({
  label, count, checked, onToggle,
}: {
  label: string
  count?: number
  checked: boolean
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
      <Checkbox checked={checked} onChange={onToggle} />
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

function PanelBody({
  counts, state, toggle, apply, clearAll,
}: {
  counts: ShopFacetCounts
  state: ShopFilterState
  toggle: (key: MultiKey, value: string) => void
  apply: (next: Partial<ShopFilterState>) => void
  clearAll: () => void
}) {
  const t = useTranslations('shop')

  // Only show category rows relevant to the selected kind — a buyer filtering
  // "Stationery" has no use for "Medical Entrance".
  const categories = state.kind.length
    ? SHOP_CATEGORIES.filter((c) => state.kind.includes(c.kind))
    : SHOP_CATEGORIES

  const showExams = !state.kind.length || state.kind.includes('BOOK')

  return (
    <div>
      <Group title={t('groups.type')}>
        <fieldset>
          <legend className="sr-only">{t('groups.type')}</legend>
          {PRODUCT_KINDS.map((k) => (
            <OptionRow
              key={k.value}
              label={t(`kind.${k.value}`)}
              count={counts.kind[k.value] ?? 0}
              checked={state.kind.includes(k.value)}
              onToggle={() => toggle('kind', k.value)}
            />
          ))}
        </fieldset>
      </Group>

      <Group title={t('groups.category')}>
        <fieldset>
          <legend className="sr-only">{t('groups.category')}</legend>
          {categories.map((c) => (
            <OptionRow
              key={c.value}
              label={t(`category.${c.value}`)}
              count={counts.category[c.value] ?? 0}
              checked={state.category.includes(c.value)}
              onToggle={() => toggle('category', c.value)}
            />
          ))}
        </fieldset>
      </Group>

      {showExams && (
        <Group title={t('groups.exam')}>
          <fieldset>
            <legend className="sr-only">{t('groups.exam')}</legend>
            <div className="flex flex-wrap gap-1.5 px-2 pt-1">
              {EXAM_TAGS.map((tag) => {
                const on = state.exam.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle('exam', tag)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-all duration-200',
                      on
                        ? 'border-transparent bg-primary-600 text-white shadow-sm'
                        : 'border-border bg-card hover:border-primary-300 hover:bg-primary-50/60 dark:hover:bg-primary-500/10',
                    )}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </Group>
      )}

      <Group title={t('groups.price')}>
        <fieldset>
          <legend className="sr-only">{t('groups.price')}</legend>
          {PRICE_BUCKETS.map((b) => (
            <OptionRow
              key={b.value}
              label={t(`price.${b.value}`)}
              count={counts.price[b.value] ?? 0}
              checked={state.price.includes(b.value)}
              onToggle={() => toggle('price', b.value)}
            />
          ))}
        </fieldset>
      </Group>

      <Group title={t('groups.availability')}>
        <fieldset>
          <legend className="sr-only">{t('groups.availability')}</legend>
          <OptionRow
            label={t('inStock')}
            checked={state.inStock}
            onToggle={() => apply({ inStock: !state.inStock })}
          />
        </fieldset>
      </Group>

      <div className="p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={clearAll}
          disabled={activeCount(state) === 0 && !state.q}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('clearAllFilters')}
        </Button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- sidebar */

export function ShopFilterSidebar({ counts }: { counts: ShopFacetCounts }) {
  const { state, apply, toggle, clearAll, pending } = useShopUrl()
  const t = useTranslations('shop')

  return (
    <aside
      aria-label={t('filters')}
      className={cn('card-base sticky top-24 overflow-hidden transition-opacity', pending && 'opacity-60')}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-extrabold tracking-tight">{t('refine')}</h2>
        {pending && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <PanelBody counts={counts} state={state} toggle={toggle} apply={apply} clearAll={clearAll} />
    </aside>
  )
}

/* ---------------------------------------------------------------- drawer */

export function ShopFilterDrawer({ counts, total }: { counts: ShopFacetCounts; total: number }) {
  const [open, setOpen] = React.useState(false)
  const { state, apply, toggle, clearAll } = useShopUrl()
  const t = useTranslations('shop')
  const active = activeCount(state)

  // Lock the page behind the sheet, and let Escape close it.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="lg:hidden">
        <SlidersHorizontal className="h-4 w-4" />
        {t('filters')}
        {active > 0 && (
          <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
            {active}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={t('filters')}>
          <button
            type="button"
            aria-label={t('closeFilters')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
              <h2 className="text-sm font-extrabold">{t('filters')}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <PanelBody counts={counts} state={state} toggle={toggle} apply={apply} clearAll={clearAll} />

            <div className="sticky bottom-0 border-t border-border bg-card p-4">
              <Button type="button" className="w-full" onClick={() => setOpen(false)}>
                {t('showProducts', { count: total })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------ search/sort */

export function ShopSearchBox({ className }: { className?: string }) {
  const { state, apply } = useShopUrl()
  const t = useTranslations('shop')
  const [value, setValue] = React.useState(state.q)

  // Keep the box honest when the query string changes underneath it (back
  // button, a cleared filter), without fighting the user mid-type.
  React.useEffect(() => setValue(state.q), [state.q])

  return (
    <form
      role="search"
      className={cn('flex gap-2', className)}
      onSubmit={(e) => {
        e.preventDefault()
        apply({ q: value.trim() })
      }}
    >
      <div className="relative flex-1">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          maxLength={80}
          className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary-400 focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit" size="sm" className="shrink-0">
        {t('searchButton')}
      </Button>
    </form>
  )
}

export function ShopSortSelect() {
  const { state, apply } = useShopUrl()
  const t = useTranslations('shop')

  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="sr-only">{t('sortLabel')}</span>
      <select
        value={state.sort}
        onChange={(e) => apply({ sort: e.target.value as ShopFilterState['sort'] })}
        className="h-10 rounded-xl border border-border bg-card px-3 text-[13px] font-semibold outline-none transition-colors hover:border-primary-300 focus:border-primary-400 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {SORT_VALUES.map((v) => (
          <option key={v} value={v}>
            {t(`sort.${v}`)}
          </option>
        ))}
      </select>
    </label>
  )
}

/* ----------------------------------------------------------- active chips */

export function ShopActiveChips() {
  const { state, apply, toggle, clearAll } = useShopUrl()
  const t = useTranslations('shop')
  if (activeCount(state) === 0 && !state.q) return null

  const chips: { key: string; label: string; clear: () => void }[] = []

  if (state.q) chips.push({ key: 'q', label: `“${state.q}”`, clear: () => apply({ q: '' }) })
  for (const v of state.kind) chips.push({ key: `kind:${v}`, label: t(`kind.${v}`), clear: () => toggle('kind', v) })
  for (const v of state.category) chips.push({ key: `cat:${v}`, label: t(`category.${v}`), clear: () => toggle('category', v) })
  for (const v of state.exam) chips.push({ key: `exam:${v}`, label: v, clear: () => toggle('exam', v) })
  for (const v of state.price) chips.push({ key: `price:${v}`, label: t(`price.${v}`), clear: () => toggle('price', v) })
  if (state.inStock) chips.push({ key: 'inStock', label: t('inStock'), clear: () => apply({ inStock: false }) })

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.clear}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-semibold transition-colors hover:border-red-300 hover:text-red-600"
        >
          {c.label}
          <X aria-hidden className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-1 text-[11.5px] font-bold text-primary-600 hover:underline"
      >
        {t('clearAllChips')}
      </button>
    </div>
  )
}
