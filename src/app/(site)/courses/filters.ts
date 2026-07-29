/**
 * Pure helpers shared by the `/courses` server page (parsing + Prisma) and the
 * client filter UI (reading + writing the query string). Deliberately free of
 * `'use client'` and of any server-only import so both sides can pull it in.
 *
 * URL shape: `/courses?q=mba&level=UG,PG&mode=ONLINE&duration=2,3&fee=0-25000&rating=4&sort=fee-asc&page=2`
 * Multi-value facets are comma separated so shared links stay readable, but a
 * repeated param (`?level=UG&level=PG`) parses identically.
 */

import type { Prisma } from '@prisma/client'
import {
  COURSE_LEVELS,
  COURSE_MODES,
  STREAMS,
  DURATION_BUCKETS,
  FEE_BUCKETS,
} from '@/lib/constants'
import { liveCourseWhere } from '@/lib/visibility'

export const PAGE_SIZE = 12

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'fee-asc', label: 'Fees: Low to High' },
  { value: 'fee-desc', label: 'Fees: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
] as const

export const RATING_BUCKETS = [
  { value: '4.5', label: '4.5 & above' },
  { value: '4', label: '4.0 & above' },
  { value: '3.5', label: '3.5 & above' },
  { value: '3', label: '3.0 & above' },
] as const

const LEVEL_VALUES: string[] = COURSE_LEVELS.map((o) => o.value)
const MODE_VALUES: string[] = COURSE_MODES.map((o) => o.value)
const STREAM_VALUES: string[] = STREAMS.map((o) => o.value)
const DURATION_VALUES: string[] = DURATION_BUCKETS.map((o) => o.value)
const FEE_VALUES: string[] = FEE_BUCKETS.map((o) => o.value)
const RATING_VALUES: string[] = RATING_BUCKETS.map((o) => o.value)
const SORT_VALUES: string[] = SORT_OPTIONS.map((o) => o.value)

export type MultiFacetKey = 'level' | 'mode' | 'stream' | 'duration' | 'fee'
export type FacetKey = MultiFacetKey | 'rating'
/** Stream is a landing-page entry point rather than a browse facet, so it carries no count. */
export type CountedFacetKey = 'level' | 'mode' | 'duration' | 'fee' | 'rating'

export type CourseFilterState = {
  q: string
  level: string[]
  mode: string[]
  stream: string[]
  duration: string[]
  fee: string[]
  rating: string
  sort: string
  page: number
}

/** Counts rendered next to each option. Plain data — safe across the RSC boundary. */
export type FacetCounts = Record<CountedFacetKey, Record<string, number>>

export type RawSearchParams = Record<string, string | string[] | undefined>

/**
 * Validates against the allow-list *and* re-orders to match it, so `?level=PG,UG`
 * and `?level=UG,PG` produce the same canonical state (and the same cache key).
 */
function list(raw: string | string[] | undefined, allowed: string[]): string[] {
  const parts = (Array.isArray(raw) ? raw : [raw ?? ''])
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
  return allowed.filter((a) => parts.includes(a))
}

function one(raw: string | string[] | undefined): string {
  return ((Array.isArray(raw) ? raw[0] : raw) ?? '').trim()
}

export function parseCourseFilters(sp: RawSearchParams): CourseFilterState {
  const rating = one(sp.rating)
  const sort = one(sp.sort)
  const page = Number.parseInt(one(sp.page), 10)

  return {
    q: one(sp.q).slice(0, 120),
    level: list(sp.level, LEVEL_VALUES),
    mode: list(sp.mode, MODE_VALUES),
    stream: list(sp.stream, STREAM_VALUES),
    duration: list(sp.duration, DURATION_VALUES),
    fee: list(sp.fee, FEE_VALUES),
    rating: RATING_VALUES.includes(rating) ? rating : '',
    sort: SORT_VALUES.includes(sort) ? sort : 'relevance',
    page: Number.isFinite(page) && page > 1 ? page : 1,
  }
}

/** Serialises back to `?a=b`, omitting defaults so clean URLs stay clean. */
export function courseQueryString(
  state: CourseFilterState,
  overrides: Partial<CourseFilterState> = {},
) {
  const s = { ...state, ...overrides }
  const p = new URLSearchParams()

  if (s.q) p.set('q', s.q)
  if (s.level.length) p.set('level', s.level.join(','))
  if (s.mode.length) p.set('mode', s.mode.join(','))
  if (s.stream.length) p.set('stream', s.stream.join(','))
  if (s.duration.length) p.set('duration', s.duration.join(','))
  if (s.fee.length) p.set('fee', s.fee.join(','))
  if (s.rating) p.set('rating', s.rating)
  if (s.sort !== 'relevance') p.set('sort', s.sort)
  if (s.page > 1) p.set('page', String(s.page))

  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

export function activeFilterCount(s: CourseFilterState) {
  return (
    s.level.length +
    s.mode.length +
    s.stream.length +
    s.duration.length +
    s.fee.length +
    (s.rating ? 1 : 0)
  )
}

export function hasAnyFilter(s: CourseFilterState) {
  return activeFilterCount(s) > 0 || s.q.length > 0
}

// ------------------------------------------------------------------ buckets

/** `4+ Years` is open-ended; every other bucket is `[n, n+1)`. */
function durationClause(v: string): Prisma.CourseWhereInput {
  switch (v) {
    case '1':
      return { durationYears: { lt: 2 } }
    case '2':
      return { durationYears: { gte: 2, lt: 3 } }
    case '3':
      return { durationYears: { gte: 3, lt: 4 } }
    default:
      return { durationYears: { gte: 4 } }
  }
}

export function durationBucketOf(years: number) {
  if (years < 2) return '1'
  if (years < 3) return '2'
  if (years < 4) return '3'
  return '4'
}

/** Fee bucket values are `min-max`; a missing max means open-ended. */
function feeRange(v: string) {
  const [min, max] = v.split('-')
  return { min: Number(min) || 0, max: max ? Number(max) : Number.POSITIVE_INFINITY }
}

function feeClause(v: string): Prisma.CourseWhereInput {
  const { min, max } = feeRange(v)
  return {
    feePerYear: Number.isFinite(max) ? { gte: min, lt: max } : { gte: min },
  }
}

export function feeBucketOf(fee: number): string | undefined {
  return FEE_BUCKETS.find((b) => {
    const { min, max } = feeRange(b.value)
    return fee >= min && fee < max
  })?.value
}

/** Every rating bucket a course qualifies for (they are cumulative thresholds). */
export function ratingBucketsOf(rating: number) {
  return RATING_BUCKETS.filter((b) => rating >= Number(b.value)).map((b) => b.value)
}

// ------------------------------------------------------------ prisma inputs

/**
 * `omit` drops one facet from the clause so that facet's own counts stay live —
 * ticking "Undergraduate" shouldn't zero out the other level counts.
 */
export function buildCourseWhere(
  s: CourseFilterState,
  omit?: FacetKey,
): Prisma.CourseWhereInput {
  // Seeded with the visibility gate so the catalogue, its counts and its facets
  // only ever reflect live courses. Everything else is ANDed on top.
  const and: Prisma.CourseWhereInput[] = [liveCourseWhere]

  if (s.q) {
    // SQLite has no `mode: 'insensitive'`, but its LIKE is already
    // case-insensitive for ASCII, which is all we need here.
    and.push({
      OR: [
        { title: { contains: s.q } },
        { subtitle: { contains: s.q } },
        { university: { name: { contains: s.q } } },
      ],
    })
  }

  if (s.stream.length && omit !== 'stream') and.push({ stream: { in: s.stream } })
  if (s.level.length && omit !== 'level') and.push({ level: { in: s.level } })
  if (s.mode.length && omit !== 'mode') and.push({ mode: { in: s.mode } })
  if (s.duration.length && omit !== 'duration') and.push({ OR: s.duration.map(durationClause) })
  if (s.fee.length && omit !== 'fee') and.push({ OR: s.fee.map(feeClause) })
  if (s.rating && omit !== 'rating') and.push({ rating: { gte: Number(s.rating) } })

  return and.length ? { AND: and } : {}
}

export function buildCourseOrderBy(sort: string): Prisma.CourseOrderByWithRelationInput[] {
  switch (sort) {
    case 'fee-asc':
      return [{ feePerYear: 'asc' }, { rating: 'desc' }]
    case 'fee-desc':
      return [{ feePerYear: 'desc' }, { rating: 'desc' }]
    case 'rating':
      return [{ rating: 'desc' }, { reviews: 'desc' }]
    case 'newest':
      return [{ createdAt: 'desc' }]
    default:
      return [{ featured: 'desc' }, { rating: 'desc' }, { reviews: 'desc' }]
  }
}
