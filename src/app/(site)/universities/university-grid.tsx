'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, MapPin, CalendarDays, BookOpen, ArrowRight, SearchX, BadgeCheck, SlidersHorizontal, X } from 'lucide-react'
import { UniversityMark } from '@/components/course/course-thumb'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { TiltCard } from '@/components/fx/tilt-card'
import { Reveal } from '@/components/fx/reveal'
import { COURSE_LEVELS, COURSE_MODES, STREAMS, DURATION_BUCKETS } from '@/lib/constants'
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
  streams: string[]
  levels: string[]
  modes: string[]
  durations: number[]
}

/** Accreditation filters. NAAC uses the dedicated grade field so "A+" doesn't also match "A++". */
const ACCREDITATIONS: { value: string; label: string; test: (u: UniversityCardData) => boolean }[] = [
  { value: 'UGC', label: 'UGC Entitled', test: (u) => u.approvals.some((a) => /ugc/i.test(a)) },
  { value: 'NAAC_APP', label: 'NAAC A++', test: (u) => u.naacGrade === 'A++' },
  { value: 'NAAC_AP', label: 'NAAC A+', test: (u) => u.naacGrade === 'A+' },
  { value: 'AICTE', label: 'AICTE Approved', test: (u) => u.approvals.some((a) => /aicte/i.test(a)) },
  { value: 'WES', label: 'WES Recognised', test: (u) => u.approvals.some((a) => /wes/i.test(a)) },
]

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'rating', label: 'Top rated' },
  { value: 'programs', label: 'Most programs' },
  { value: 'learners', label: 'Most learners' },
  { value: 'name', label: 'Name (A–Z)' },
]

const EMPTY = { q: '', stream: '', level: '', mode: '', duration: '', accred: '', state: '', minRating: '', sort: 'featured' }

export function UniversityGrid({ universities }: { universities: UniversityCardData[] }) {
  const [f, setF] = React.useState(EMPTY)
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }))

  // Only offer options that actually exist across the current institutions.
  const opts = React.useMemo(() => {
    const has = (pick: (u: UniversityCardData) => string[] | number[], v: string | number) =>
      universities.some((u) => (pick(u) as (string | number)[]).includes(v))
    return {
      streams: STREAMS.filter((s) => has((u) => u.streams, s.value)),
      levels: COURSE_LEVELS.filter((l) => has((u) => u.levels, l.value)),
      modes: COURSE_MODES.filter((m) => has((u) => u.modes, m.value)),
      durations: DURATION_BUCKETS.filter((d) => has((u) => u.durations, Number(d.value))),
      accreds: ACCREDITATIONS.filter((a) => universities.some(a.test)),
      states: [...new Set(universities.map((u) => u.state))].sort(),
    }
  }, [universities])

  const results = React.useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const accred = ACCREDITATIONS.find((a) => a.value === f.accred)
    const list = universities.filter(
      (u) =>
        (!q || [u.name, u.shortName, u.city, u.state].some((x) => x.toLowerCase().includes(q))) &&
        (!f.stream || u.streams.includes(f.stream)) &&
        (!f.level || u.levels.includes(f.level)) &&
        (!f.mode || u.modes.includes(f.mode)) &&
        (!f.duration || u.durations.includes(Number(f.duration))) &&
        (!accred || accred.test(u)) &&
        (!f.state || u.state === f.state) &&
        (!f.minRating || u.rating >= Number(f.minRating)),
    )
    const sorted = [...list]
    if (f.sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
    else if (f.sort === 'programs') sorted.sort((a, b) => b.courseCount - a.courseCount)
    else if (f.sort === 'learners') sorted.sort((a, b) => b.students - a.students)
    else if (f.sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }, [f, universities])

  const activeCount =
    (f.stream ? 1 : 0) + (f.level ? 1 : 0) + (f.mode ? 1 : 0) + (f.duration ? 1 : 0) +
    (f.accred ? 1 : 0) + (f.state ? 1 : 0) + (f.minRating ? 1 : 0)

  return (
    <div>
      {/* -------------------------------------------------------- filter bar */}
      <div className="card-base mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="search" className="relative w-full flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={f.q}
              onChange={set('q')}
              placeholder="Search by institute, city or state…"
              aria-label="Search universities"
              className={cn(
                'h-11 w-full rounded-xl border border-input bg-surface pl-10 pr-3.5 text-sm shadow-sm',
                'transition-all duration-200 placeholder:text-muted-foreground/70',
                'focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/12',
              )}
            />
          </div>
          <label className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            Sort
            <Select value={f.sort} onChange={set('sort')} aria-label="Sort universities" className="h-11 sm:w-40">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <FilterSelect label="Discipline" value={f.stream} onChange={set('stream')} options={opts.streams} anyLabel="All disciplines" />
          <FilterSelect label="Course level" value={f.level} onChange={set('level')} options={opts.levels} anyLabel="Any level" />
          <FilterSelect label="Mode" value={f.mode} onChange={set('mode')} options={opts.modes} anyLabel="Any mode" />
          <FilterSelect label="Duration" value={f.duration} onChange={set('duration')} options={opts.durations} anyLabel="Any duration" />
          <FilterSelect label="Accreditation" value={f.accred} onChange={set('accred')} options={opts.accreds} anyLabel="Any accreditation" />
          <FilterSelect
            label="Location"
            value={f.state}
            onChange={set('state')}
            options={opts.states.map((s) => ({ value: s, label: s }))}
            anyLabel="All states"
          />
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <FilterSelect
            label="Minimum rating"
            value={f.minRating}
            onChange={set('minRating')}
            options={[
              { value: '4.5', label: '4.5 & up' },
              { value: '4', label: '4.0 & up' },
              { value: '3.5', label: '3.5 & up' },
            ]}
            anyLabel="Any rating"
          />
        </div>
      </div>

      {/* --------------------------------------------------- result summary */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-[13px] text-muted-foreground">
          <strong className="font-bold text-foreground">{results.length}</strong>{' '}
          {results.length === 1 ? 'institution' : 'institutions'}
          {(f.q.trim() || activeCount > 0) && ' match your filters'}
        </p>
        {(f.q.trim() || activeCount > 0) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setF(EMPTY)}>
            <X className="h-3.5 w-3.5" />
            Clear{activeCount > 0 ? ` (${activeCount + (f.q.trim() ? 1 : 0)})` : ''}
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="card-base flex flex-col items-center gap-3 px-6 py-16 text-center">
          <SearchX aria-hidden className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="text-lg font-extrabold">No universities found</h2>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">
            No institution matches these filters. Try widening your search or clearing a filter.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setF(EMPTY)}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((u, i) => {
            const hue = [...u.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
            return (
              <Reveal key={u.id} delay={Math.min(i, 8) * 55}>
                <TiltCard className="group h-full" intensity={6} scale={1.012}>
                  <article className="card-base holo-ring holo-ring-hover relative flex h-full flex-col overflow-hidden p-5 hover:shadow-lift">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-28 transition-opacity duration-300 group-hover:opacity-80"
                      style={{ background: `linear-gradient(180deg, hsl(${hue} 84% 58% / 0.16), transparent)` }}
                    />
                    <div className="relative flex flex-1 flex-col">
                      <div className="flex items-start gap-3.5">
                        <UniversityMark name={u.name} size={52} className="shadow-soft" />
                        <div className="min-w-0 flex-1">
                          <h2 className="text-pretty text-[15px] font-extrabold leading-snug">
                            <Link href={`/universities/${u.slug}`} className="transition-colors hover:text-primary-600">
                              {u.name}
                            </Link>
                          </h2>
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                            <MapPin aria-hidden className="h-3 w-3 shrink-0" />
                            <span className="truncate">{u.city}, {u.state}</span>
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
                        {u.approvals.length > 3 && <Badge tone="default">+{u.approvals.length - 3}</Badge>}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3">
                        {[
                          { icon: CalendarDays, label: 'Est.', value: String(u.estYear) },
                          { icon: BookOpen, label: 'Programs', value: String(u.courseCount) },
                          { icon: BadgeCheck, label: 'NAAC', value: u.naacGrade ?? '—' },
                        ].map((stat) => (
                          <div key={stat.label} className="text-center">
                            <stat.icon aria-hidden className="mx-auto h-3.5 w-3.5 text-primary-500" />
                            <span className="mt-1 block text-[13px] font-extrabold leading-none">{stat.value}</span>
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
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: readonly { value: string; label: string }[]
  anyLabel: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-muted-foreground">{label}</span>
      <Select value={value} onChange={onChange} aria-label={label} className="h-10 w-full">
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </label>
  )
}
