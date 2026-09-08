import type { Prisma } from '@prisma/client'
import { liveProducts } from '@/lib/visibility'
import { PRICE_BUCKETS, SHOP_SORTS, type ShopSort } from '@/lib/shop'

/**
 * URL ⇄ Prisma translation for the shop listing.
 *
 * Kept beside the page, mirroring `courses/filters.ts`, so the listing, the
 * facet counts and the filter chips all read the query string exactly one way.
 * Every value is validated against a known list — a hand-edited query string
 * must never reach Prisma unchecked.
 */

export const PAGE_SIZE = 12

export type RawSearchParams = Record<string, string | string[] | undefined>

export type ShopFilterState = {
  q: string
  kind: string[]
  category: string[]
  exam: string[]
  price: string[]
  inStock: boolean
  sort: ShopSort
  page: number
}

/** A repeated param may arrive as a string, an array, or a comma-joined string. */
function toList(value: string | string[] | undefined): string[] {
  if (!value) return []
  const raw = Array.isArray(value) ? value : [value]
  return raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean)
}

export function parseShopFilters(params: RawSearchParams): ShopFilterState {
  const sortRaw = typeof params.sort === 'string' ? params.sort : 'relevance'
  const pageRaw = Number(Array.isArray(params.page) ? params.page[0] : params.page)

  return {
    q: (typeof params.q === 'string' ? params.q : '').trim().slice(0, 80),
    kind: toList(params.kind),
    category: toList(params.category),
    exam: toList(params.exam),
    price: toList(params.price),
    inStock: params.inStock === '1' || params.inStock === 'true',
    sort: (sortRaw in SHOP_SORTS ? sortRaw : 'relevance') as ShopSort,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
  }
}

export function hasAnyFilter(s: ShopFilterState): boolean {
  return Boolean(
    s.q || s.kind.length || s.category.length || s.exam.length || s.price.length || s.inStock,
  )
}

/**
 * Builds the Prisma filter, always wrapped by the published-only rule.
 *
 * Note the AND-of-ORs shape: each facet is an OR within itself (a buyer ticking
 * two categories wants either), but facets AND together (ticking "Books" and
 * "NEET" wants both). Flattening these would quietly turn the rail into an
 * or-everything filter that never narrows anything.
 */
export function buildShopWhere(s: ShopFilterState): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = []

  if (s.q) {
    and.push({
      OR: [
        { title: { contains: s.q, mode: 'insensitive' } },
        { subtitle: { contains: s.q, mode: 'insensitive' } },
        { author: { contains: s.q, mode: 'insensitive' } },
        { brand: { contains: s.q, mode: 'insensitive' } },
        { publisher: { contains: s.q, mode: 'insensitive' } },
        { isbn: { contains: s.q, mode: 'insensitive' } },
      ],
    })
  }

  if (s.kind.length) and.push({ kind: { in: s.kind } })
  if (s.category.length) and.push({ category: { in: s.category } })
  if (s.inStock) and.push({ stock: { gt: 0 } })

  if (s.price.length) {
    const ranges = PRICE_BUCKETS.filter((b) => s.price.includes(b.value)).map((b) => ({
      price: { gte: b.min, lte: b.max },
    }))
    if (ranges.length) and.push({ OR: ranges })
  }

  // examTags is a Json string[]; Prisma's array_contains matches one value at a
  // time, so several selected exams become an OR of single-value checks.
  if (s.exam.length) {
    and.push({ OR: s.exam.map((tag) => ({ examTags: { array_contains: [tag] } })) })
  }

  return liveProducts(and.length ? { AND: and } : undefined)
}

export function buildShopOrderBy(s: ShopFilterState): Prisma.ProductOrderByWithRelationInput[] {
  const primary = SHOP_SORTS[s.sort]
  // Featured-first for relevance, then a stable tiebreak so pagination can't
  // show the same product on two pages.
  return s.sort === 'relevance'
    ? [{ featured: 'desc' }, { rating: 'desc' }, { id: 'asc' }]
    : [primary as Prisma.ProductOrderByWithRelationInput, { id: 'asc' }]
}

/** Rebuilds the query string with one facet toggled or overridden. */
export function shopQueryString(
  s: ShopFilterState,
  override: Partial<ShopFilterState> = {},
): string {
  const next = { ...s, ...override }
  const p = new URLSearchParams()

  if (next.q) p.set('q', next.q)
  for (const k of next.kind) p.append('kind', k)
  for (const c of next.category) p.append('category', c)
  for (const e of next.exam) p.append('exam', e)
  for (const b of next.price) p.append('price', b)
  if (next.inStock) p.set('inStock', '1')
  if (next.sort !== 'relevance') p.set('sort', next.sort)
  // A page override of 1 is the default and stays out of the URL.
  if (next.page > 1) p.set('page', String(next.page))

  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

/** Toggles one value inside a multi-select facet, resetting to page 1. */
export function toggled(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}
