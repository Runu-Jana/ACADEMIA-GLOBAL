import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronRight, SearchX, ChevronLeft, Sparkles } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { CourseCard } from '@/components/course/course-card'
import {
  ActiveFilterChips, CourseFilterDrawer, CourseFilterSidebar, CourseSearchBox, CourseSortSelect,
} from '@/components/course/course-filters'
import { Reveal } from '@/components/fx/reveal'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { SmartScrollToResults } from '@/components/course/smart-scroll'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  PAGE_SIZE, buildCourseOrderBy, buildCourseWhere, courseQueryString, durationBucketOf,
  feeBucketOf, hasAnyFilter, parseCourseFilters, ratingBucketsOf,
  type CourseFilterState, type FacetCounts, type RawSearchParams,
} from './filters'

export const metadata: Metadata = {
  title: 'Explore Courses',
  description:
    'Browse UGC-entitled online, distance and regular degree programs. Filter by level, delivery mode, duration, fees and rating to find the course that fits your life.',
}

const courseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} as const

function tally(values: string[]) {
  const out: Record<string, number> = {}
  for (const v of values) out[v] = (out[v] ?? 0) + 1
  return out
}

/** 1 … 4 5 6 … 12 — keeps the control to a fixed width at any page count. */
function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const out: (number | 'gap')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) out.push('gap')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('gap')
  out.push(total)

  return out
}

async function Pagination({ state, page, totalPages }: {
  state: CourseFilterState
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null
  const t = await getTranslations('courses')

  const href = (n: number) => `/courses${courseQueryString(state, { page: n })}`
  const stepClass =
    'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-border px-3 text-[13px] font-bold transition-all duration-300 ease-spring'

  return (
    <nav aria-label={t('pagesLabel')} className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(stepClass, 'bg-card hover:border-primary-300 hover:shadow-card')}>
          <ChevronLeft aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">{t('prev')}</span>
        </Link>
      ) : (
        <span aria-disabled className={cn(stepClass, 'cursor-not-allowed opacity-40')}>
          <ChevronLeft aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">{t('prev')}</span>
        </span>
      )}

      {pageWindow(page, totalPages).map((entry, i) =>
        entry === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : entry === page ? (
          <span
            key={entry}
            aria-current="page"
            className={cn(stepClass, 'border-transparent bg-holo-sweep text-white shadow-glow')}
          >
            {entry}
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-label={t('goToPage', { n: entry })}
            className={cn(stepClass, 'bg-card hover:border-primary-300 hover:shadow-card')}
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={cn(stepClass, 'bg-card hover:border-primary-300 hover:shadow-card')}>
          <span className="hidden sm:inline">{t('next')}</span>
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-disabled className={cn(stepClass, 'cursor-not-allowed opacity-40')}>
          <span className="hidden sm:inline">{t('next')}</span>
          <ChevronRight aria-hidden className="h-4 w-4" />
        </span>
      )}
    </nav>
  )
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const state = parseCourseFilters(await searchParams)
  const where = buildCourseWhere(state)
  const t = await getTranslations('courses')

  // Each facet is counted against every filter *except its own*, so ticking
  // "Undergraduate" leaves the other level counts visible instead of zeroing
  // them out. Cheap here: the projections pull a single column each.
  const [total, levelRows, modeRows, durationRows, feeRows, ratingRows] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({ where: buildCourseWhere(state, 'level'), select: { level: true } }),
    prisma.course.findMany({ where: buildCourseWhere(state, 'mode'), select: { mode: true } }),
    prisma.course.findMany({ where: buildCourseWhere(state, 'duration'), select: { durationYears: true } }),
    prisma.course.findMany({ where: buildCourseWhere(state, 'fee'), select: { feePerYear: true } }),
    prisma.course.findMany({ where: buildCourseWhere(state, 'rating'), select: { rating: true } }),
  ])

  const counts: FacetCounts = {
    level: tally(levelRows.map((r) => r.level)),
    mode: tally(modeRows.map((r) => r.mode)),
    duration: tally(durationRows.map((r) => durationBucketOf(r.durationYears))),
    fee: tally(
      feeRows
        .map((r) => feeBucketOf(r.feePerYear))
        .filter((v): v is NonNullable<typeof v> => v !== undefined),
    ),
    rating: tally(ratingRows.flatMap((r) => ratingBucketsOf(r.rating))),
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(state.page, totalPages)

  const courses = await prisma.course.findMany({
    where,
    select: courseSelect,
    orderBy: buildCourseOrderBy(state.sort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  const heading = state.q ? t('searchResults', { q: state.q }) : t('allCourses')

  // Empty on a bare /courses visit; a stable string per active filter set. Drives
  // the smart-scroll: arrive via a category link → glide to the results below.
  const scrollSignature = courseQueryString(state)

  return (
    <>
      <SmartScrollToResults targetId="course-results" signature={scrollSignature} />
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <Aurora palette="holo" density={3} />
        <GridPattern className="opacity-30" />

        <div className="container relative z-10 py-9 sm:py-12">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70 sm:text-xs">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  {t('home')}
                </Link>
              </li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li aria-current="page" className="text-white">
                {t('courses')}
              </li>
            </ol>
          </nav>

          <h1 className="mt-3 text-balance text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.75rem]">
            {t.rich('heroTitle', { accent: (chunks) => <span className="holo-text-bright">{chunks}</span> })}
          </h1>
          <p className="mt-2.5 max-w-xl text-pretty text-sm text-white/80 sm:text-[15px]">
            {t('heroSub', { total })}
          </p>

          <CourseSearchBox className="mt-6 max-w-2xl" />
        </div>
      </section>

      {/* ---------------------------------------------------------- results */}
      <section
        id="course-results"
        className="container scroll-mt-24 py-8 lg:scroll-mt-28 lg:py-10"
      >
        <div className="grid items-start gap-6 lg:grid-cols-[264px_minmax(0,1fr)] xl:gap-8">
          <CourseFilterSidebar counts={counts} />

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                  {heading}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {t('found', { count: total })}
                  {totalPages > 1 && (
                    <span className="hidden sm:inline"> · {t('pageOf', { page, total: totalPages })}</span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <CourseFilterDrawer counts={counts} total={total} />
                <CourseSortSelect />
              </div>
            </div>

            <div className="mb-5 empty:mb-0">
              <ActiveFilterChips />
            </div>

            {courses.length === 0 ? (
              <div className="card-base holo-ring flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
                <span
                  aria-hidden
                  className="grid h-16 w-16 place-items-center rounded-2xl bg-holo-sweep shadow-glow"
                >
                  <SearchX className="h-8 w-8 text-white" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold">{t('emptyTitle')}</h3>
                  <p className="mx-auto mt-1.5 max-w-sm text-pretty text-sm text-muted-foreground">
                    {state.q ? t('emptyWithQuery', { q: state.q }) : t('emptyNoQuery')}
                  </p>
                </div>
                {hasAnyFilter(state) && (
                  <Link href="/courses" className={buttonVariants({ variant: 'holo' })}>
                    <Sparkles className="h-4 w-4" />
                    {t('clearAllFilters')}
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {courses.map((course, i) => (
                    <Reveal key={course.id} delay={Math.min(i, 8) * 55}>
                      <CourseCard course={course} />
                    </Reveal>
                  ))}
                </div>

                <Pagination state={state} page={page} totalPages={totalPages} />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
