'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, MapPin, CalendarDays, BookOpen, ArrowRight, SearchX, BadgeCheck } from 'lucide-react'
import { UniversityMark } from '@/components/course/course-thumb'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { Button } from '@/components/ui/button'
import { TiltCard } from '@/components/fx/tilt-card'
import { Reveal } from '@/components/fx/reveal'
import { cn, formatCount } from '@/lib/utils'

export type UniversityCardData = {
  id: string
  slug: string
  name: string
  shortName: string
  city: string
  state: string
  estYear: number
  rating: number
  reviews: number
  students: number
  naacGrade: string | null
  approvals: string[]
  courseCount: number
}

/** Client-side filter: the full list is small enough that a round trip per keystroke would be waste. */
export function UniversityGrid({ universities }: { universities: UniversityCardData[] }) {
  const [query, setQuery] = React.useState('')

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return universities
    return universities.filter((u) =>
      [u.name, u.shortName, u.city, u.state].some((field) => field.toLowerCase().includes(q)),
    )
  }, [query, universities])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="search" className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by university, city or state…"
            aria-label="Search universities by name"
            className={cn(
              'h-11 w-full rounded-xl border border-input bg-surface pl-10 pr-3.5 text-sm shadow-sm',
              'transition-all duration-200 placeholder:text-muted-foreground/70',
              'focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/12',
            )}
          />
        </div>

        <p aria-live="polite" className="text-[13px] text-muted-foreground">
          <strong className="font-bold text-foreground">{results.length}</strong>{' '}
          {results.length === 1 ? 'institution' : 'institutions'}
          {query.trim() && ' matching your search'}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="card-base flex flex-col items-center gap-3 px-6 py-16 text-center">
          <SearchX aria-hidden className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="text-lg font-extrabold">No universities found</h2>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">
            We couldn&rsquo;t match &ldquo;{query.trim()}&rdquo; to any institution. Try a shorter
            name or search by city.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((u, i) => (
            <Reveal key={u.id} delay={Math.min(i, 8) * 55}>
              <TiltCard className="group h-full" intensity={6} scale={1.012}>
                <article className="card-base holo-ring holo-ring-hover flex h-full flex-col p-5 hover:shadow-lift">
                  <div className="flex items-start gap-3.5">
                    <UniversityMark name={u.name} size={52} className="shadow-soft" />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-pretty text-[15px] font-extrabold leading-snug">
                        <Link
                          href={`/universities/${u.slug}`}
                          className="transition-colors hover:text-primary-600"
                        >
                          {u.name}
                        </Link>
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        <MapPin aria-hidden className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {u.city}, {u.state}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {u.approvals.slice(0, 3).map((a) => (
                      <Badge key={a} tone="primary">
                        <BadgeCheck className="h-3 w-3" />
                        {a}
                      </Badge>
                    ))}
                    {u.approvals.length > 3 && (
                      <Badge tone="default">+{u.approvals.length - 3}</Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3">
                    {[
                      { icon: CalendarDays, label: 'Est.', value: String(u.estYear) },
                      { icon: BookOpen, label: 'Programs', value: String(u.courseCount) },
                      { icon: BadgeCheck, label: 'NAAC', value: u.naacGrade ?? '—' },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <stat.icon
                          aria-hidden
                          className="mx-auto h-3.5 w-3.5 text-primary-500"
                        />
                        <span className="mt-1 block text-[13px] font-extrabold leading-none">
                          {stat.value}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3.5 flex items-center justify-between gap-2">
                    <Stars rating={u.rating} count={u.reviews} size={12} />
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {formatCount(u.students)} learners
                    </span>
                  </div>

                  <Link
                    href={`/universities/${u.slug}`}
                    className={cn(
                      'mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border',
                      'text-[13px] font-bold transition-all duration-300 ease-spring',
                      'hover:border-primary-300 hover:bg-primary-50/60 dark:hover:bg-primary-500/10',
                    )}
                  >
                    View Profile
                    <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}
