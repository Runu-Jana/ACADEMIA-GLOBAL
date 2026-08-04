'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  X, Check, Plus, GitCompare, Trash2, ArrowRight, Clock, Loader2, AlertCircle, Sparkles,
} from 'lucide-react'
import { CourseThumb, UniversityMark } from '@/components/course/course-thumb'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { Button, buttonVariants } from '@/components/ui/button'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { useCompare, MAX_COMPARE } from '@/lib/use-compare'
import { cn, formatINR } from '@/lib/utils'
import { COURSE_LEVELS, COURSE_MODES } from '@/lib/constants'
import type { CompareCourse } from '@/app/api/compare/route'

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value

const totalFeeOf = (c: CompareCourse) => Math.round(c.feePerYear * c.durationYears)

function YesNo({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full',
        value
          ? 'bg-accent-green/15 text-accent-green'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {value ? (
        <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
      ) : (
        <X aria-hidden className="h-4 w-4" strokeWidth={3} />
      )}
      <span className="sr-only">{value ? 'Yes' : 'No'}</span>
    </span>
  )
}

/** Small "best of the shortlist" marker so the table has an opinion. */
function Best({ label }: { label: string }) {
  return (
    <Badge tone="success" className="ml-2 align-middle">
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  )
}

export default function ComparePage() {
  const { ids, ready, remove, clear, count } = useCompare()
  const [courses, setCourses] = React.useState<CompareCourse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)

  const key = ids.join(',')

  React.useEffect(() => {
    if (!ready) return

    if (!key) {
      setCourses([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setFailed(false)

    fetch(`/api/compare?ids=${encodeURIComponent(key)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { courses?: CompareCourse[] }) => {
        if (cancelled) return
        const list = data.courses ?? []
        setCourses(list)

        // Drop shortlisted ids that no longer resolve (course withdrawn) so the
        // tray doesn't keep a phantom slot forever.
        const returned = new Set(list.map((c) => c.id))
        for (const id of key.split(',')) if (!returned.has(id)) remove(id)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key, ready, remove])

  const cheapest = courses.length > 1 ? Math.min(...courses.map((c) => c.feePerYear)) : -1
  const cheapestTotal = courses.length > 1 ? Math.min(...courses.map(totalFeeOf)) : -1
  const topRated = courses.length > 1 ? Math.max(...courses.map((c) => c.rating)) : -1

  const rows: { key: string; label: string; render: (c: CompareCourse) => React.ReactNode }[] = [
    {
      key: 'course',
      label: 'Course',
      render: (c) => (
        <Link
          href={`/courses/${c.slug}`}
          className="block text-[13px] font-bold leading-snug transition-colors hover:text-primary-600"
        >
          {c.title}
        </Link>
      ),
    },
    {
      key: 'university',
      label: 'University',
      render: (c) => (
        <span className="flex items-center gap-2">
          <UniversityMark name={c.university.name} size={22} />
          <Link
            href={`/universities/${c.university.slug}`}
            className="text-[13px] font-semibold leading-snug transition-colors hover:text-primary-600"
          >
            {c.university.name}
          </Link>
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
          <Clock aria-hidden className="h-3.5 w-3.5 text-primary-500" />
          {c.durationYears} {c.durationYears === 1 ? 'Year' : 'Years'}
        </span>
      ),
    },
    {
      key: 'mode',
      label: 'Mode',
      render: (c) => <span className="chip">{labelOf(COURSE_MODES, c.mode)}</span>,
    },
    {
      key: 'level',
      label: 'Level',
      render: (c) => <span className="chip">{labelOf(COURSE_LEVELS, c.level)}</span>,
    },
    {
      key: 'fee',
      label: 'Fees (per year)',
      render: (c) => (
        <span className="block">
          <span className="text-[15px] font-extrabold text-primary-700 dark:text-primary-300">
            {formatINR(c.feePerYear)}
          </span>
          {c.originalFee && c.originalFee > c.feePerYear && (
            <span className="ml-1.5 text-[11px] text-muted-foreground line-through">
              {formatINR(c.originalFee)}
            </span>
          )}
          {c.feePerYear === cheapest && <Best label="Lowest" />}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total Fees',
      render: (c) => (
        <span className="block text-[13px] font-bold tabular-nums">
          {formatINR(totalFeeOf(c))}
          {totalFeeOf(c) === cheapestTotal && <Best label="Lowest" />}
        </span>
      ),
    },
    { key: 'ugc', label: 'UGC Entitled', render: (c) => <YesNo value={c.isUgcEntitled} /> },
    {
      key: 'rating',
      label: 'Rating',
      render: (c) => (
        <span className="block">
          <Stars rating={c.rating} count={c.reviews} size={12} />
          {c.rating === topRated && <Best label="Top rated" />}
        </span>
      ),
    },
    {
      key: 'placement',
      label: 'Placement Assistance',
      render: (c) => <YesNo value={c.hasPlacement} />,
    },
    { key: 'live', label: 'Live Classes', render: (c) => <YesNo value={c.hasLiveClass} /> },
    {
      key: 'exam',
      label: 'Examination',
      render: (c) => <span className="text-[13px] font-semibold">{c.examMode}</span>,
    },
    {
      key: 'skills',
      label: 'Skills',
      render: (c) => (
        <span className="flex flex-wrap gap-1.5">
          {c.skills.length > 0 ? (
            c.skills.slice(0, 6).map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (c) => (
        <span className="flex flex-col gap-2">
          <Link
            href={`/apply/${c.slug}`}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            Apply Now
          </Link>
          <Link
            href={`/courses/${c.slug}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            View Details
          </Link>
        </span>
      ),
    },
  ]

  const stickyCell =
    'sticky left-0 z-10 min-w-[132px] max-w-[132px] border-b border-border bg-card px-3 py-3.5 text-left align-middle sm:min-w-[160px] sm:max-w-[160px]'
  const bodyCell = 'min-w-[220px] border-b border-l border-border px-4 py-3.5 align-middle'

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <Aurora palette="holo" density={3} />
        <GridPattern className="opacity-25" />

        <div className="container relative z-10 py-9 sm:py-11">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-white/70">
                <span className="h-px w-6 bg-white/50" />
                Side by side
              </span>
              <h1 className="mt-2 text-balance text-3xl font-extrabold leading-tight sm:text-4xl">
                Compare <span className="holo-text-bright">Courses</span>
              </h1>
              <p className="mt-2 max-w-xl text-pretty text-sm text-white/80">
                {count > 0
                  ? `${count} of ${MAX_COMPARE} slots used. Fees, duration, entitlement and outcomes lined up so the trade-offs are obvious.`
                  : `Shortlist up to ${MAX_COMPARE} programs from anywhere on the site and weigh them up here.`}
              </p>
            </div>

            {count > 0 && (
              <Button type="button" variant="glass" size="sm" onClick={clear}>
                <Trash2 className="h-3.5 w-3.5" />
                Clear comparison
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="container py-8 lg:py-10">
        {!ready || loading ? (
          <div className="card-base flex flex-col items-center gap-3 px-6 py-20 text-center">
            <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-sm font-semibold text-muted-foreground">Loading your shortlist…</p>
          </div>
        ) : failed ? (
          <div className="card-base flex flex-col items-center gap-3 px-6 py-16 text-center">
            <AlertCircle aria-hidden className="h-9 w-9 text-accent-orange" />
            <h2 className="text-lg font-extrabold">We couldn&rsquo;t load your comparison</h2>
            <p className="max-w-sm text-pretty text-sm text-muted-foreground">
              Something went wrong fetching these courses. Check your connection and try again.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : courses.length === 0 ? (
          /* ------------------------------------------------------ empty */
          <div className="card-base holo-ring flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-24">
            <span
              aria-hidden
              className="grid h-16 w-16 place-items-center rounded-2xl bg-holo-sweep shadow-glow"
            >
              <GitCompare className="h-8 w-8 text-white" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">Nothing to compare yet</h2>
              <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-muted-foreground">
                Tap the compare icon on any course card — or &ldquo;Add to Compare&rdquo; on a
                course page — to line up to {MAX_COMPARE} programs against each other.
              </p>
            </div>
            <Link href="/courses" className={buttonVariants({ variant: 'holo' })}>
              Browse Courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          /* ------------------------------------------------------ table */
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-left">
                <caption className="sr-only">
                  Side-by-side comparison of {courses.length} shortlisted courses
                </caption>

                <thead>
                  <tr>
                    <th
                      scope="col"
                      className={cn(stickyCell, 'z-20 bg-muted/60 align-bottom text-[11px] font-bold uppercase tracking-wider text-muted-foreground')}
                    >
                      Comparing
                    </th>

                    {courses.map((c) => (
                      <th key={c.id} scope="col" className={cn(bodyCell, 'bg-muted/40 align-top')}>
                        <div className="relative">
                          <CourseThumb
                            stream={c.stream}
                            title={c.title}
                            className="h-20 rounded-xl"
                            compact
                          />
                          <button
                            type="button"
                            onClick={() => remove(c.id)}
                            aria-label={`Remove ${c.title} from comparison`}
                            className={cn(
                              'absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg',
                              'bg-white/85 text-slate-600 backdrop-blur-md transition-all duration-300',
                              'hover:bg-white hover:text-red-600 active:scale-90',
                            )}
                          >
                            <X aria-hidden className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <Link
                          href={`/courses/${c.slug}`}
                          className="mt-2.5 block text-[13px] font-extrabold leading-snug transition-colors hover:text-primary-600"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
                          {c.university.shortName}
                        </p>
                      </th>
                    ))}

                    {courses.length < MAX_COMPARE && (
                      <th scope="col" className={cn(bodyCell, 'bg-muted/40 align-middle')}>
                        <Link
                          href="/courses"
                          className={cn(
                            'flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-xl',
                            'border-2 border-dashed border-border px-4 py-6 text-center',
                            'transition-all duration-300 ease-spring hover:border-primary-300 hover:bg-primary-50/50',
                            'dark:hover:bg-primary-500/10',
                          )}
                        >
                          <span
                            aria-hidden
                            className="grid h-9 w-9 place-items-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300"
                          >
                            <Plus className="h-4 w-4" />
                          </span>
                          <span className="text-[13px] font-bold">Add More Courses</span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {MAX_COMPARE - courses.length} slot
                            {MAX_COMPARE - courses.length === 1 ? '' : 's'} left
                          </span>
                        </Link>
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="transition-colors hover:bg-muted/30">
                      <th
                        scope="row"
                        className={cn(stickyCell, 'text-[11px] font-bold uppercase tracking-wider text-muted-foreground')}
                      >
                        {row.label}
                      </th>

                      {courses.map((c) => (
                        <td key={c.id} className={bodyCell}>
                          {row.render(c)}
                        </td>
                      ))}

                      {courses.length < MAX_COMPARE && (
                        <td className={cn(bodyCell, 'text-center text-muted-foreground')} aria-hidden>
                          —
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {courses.length > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground lg:hidden">
            Swipe the table sideways to see every column.
          </p>
        )}
      </section>
    </>
  )
}
