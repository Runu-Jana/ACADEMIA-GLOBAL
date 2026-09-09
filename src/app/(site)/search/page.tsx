import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Search, SearchX, GraduationCap, Building2, ShoppingBag, ScrollText, MapPin, Star, ArrowRight,
} from 'lucide-react'
import { searchAll, MIN_QUERY, type UniversityHit } from '@/lib/search'
import type { Exam } from '@/lib/exams'
import { CourseCard } from '@/components/course/course-card'
import { ProductCard } from '@/components/shop/product-card'
import { Badge } from '@/components/ui/badge'
import { SearchBox } from '@/components/layout/search-box'

export const dynamic = 'force-dynamic'

type SP = Promise<{ q?: string }>

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  return {
    title: query ? `Search: ${query}` : 'Search',
    description: query
      ? `Courses, universities, books and exams matching “${query}” on Shiksha Sarthi.`
      : 'Search across courses, universities, the student shop and entrance exams.',
    robots: { index: false }, // result pages shouldn't be indexed
  }
}

/** A compact university result — avoids the heavy, client-side directory card. */
function UniversityResult({ u }: { u: UniversityHit }) {
  return (
    <Link
      href={`/universities/${u.slug}`}
      className="card-base holo-ring-hover flex items-center gap-3 p-4 transition-shadow hover:shadow-lift"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-fade text-[13px] font-extrabold text-white">
        {u.shortName.slice(0, 3).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold">{u.name}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          {u.city}, {u.state}
        </span>
      </span>
      {u.reviews > 0 && (
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {u.rating.toFixed(1)}
        </span>
      )}
    </Link>
  )
}

/** A compact exam result linking back to its card on /exams. */
function ExamResult({ e }: { e: Exam }) {
  return (
    <Link
      href={`/exams#exam-${e.slug}`}
      className="card-base holo-ring-hover flex flex-col gap-2 p-4 transition-shadow hover:shadow-lift"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-bold leading-snug">{e.name}</span>
        <Badge tone={e.tone}>{e.category}</Badge>
      </span>
      <span className="line-clamp-2 text-[12.5px] text-muted-foreground">{e.blurb}</span>
    </Link>
  )
}

/** Section heading with a hit count. */
function GroupHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ElementType
  title: string
  count: number
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4.5 w-4.5 text-primary-600" />
      <h2 className="font-display text-lg font-extrabold tracking-tight">{title}</h2>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
        {count}
      </span>
    </div>
  )
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const { q: rawQ } = await searchParams
  const q = (rawQ ?? '').trim()

  const results = await searchAll(q, { courses: 24, universities: 12, products: 24, exams: 10 })
  const tooShort = q.length > 0 && q.length < MIN_QUERY
  const hasResults = results.total > 0

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Search <span className="holo-text">Shiksha Sarthi</span>
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Courses, universities, the student shop and entrance exams — all in one place.
        </p>
        <div className="mt-5">
          <SearchBox variant="bar" initialQuery={q} className="w-full" />
        </div>
      </div>

      <div className="mt-10">
        {/* No query yet */}
        {q.length === 0 && (
          <div className="card-base flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Search aria-hidden className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-[15px] font-bold">Start typing to search</p>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Try a course like “MBA”, a university, a book, or an exam such as “NEET”.
            </p>
          </div>
        )}

        {/* Query too short */}
        {tooShort && (
          <p className="text-center text-[14px] text-muted-foreground">
            Please type at least {MIN_QUERY} characters.
          </p>
        )}

        {/* Nothing matched */}
        {q.length >= MIN_QUERY && !hasResults && (
          <div className="card-base flex flex-col items-center gap-3 px-6 py-16 text-center">
            <SearchX aria-hidden className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-[15px] font-bold">No results for “{q}”</p>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Check the spelling, or try a broader term — a stream, a city, or an exam name.
            </p>
            <Link href="/courses" className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600 hover:underline">
              Browse all courses
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {hasResults && (
          <div className="space-y-12">
            <p className="text-[13px] text-muted-foreground">
              <strong className="font-bold text-foreground">{results.total}</strong>{' '}
              {results.total === 1 ? 'result' : 'results'} for “{q}”
            </p>

            {results.courses.length > 0 && (
              <section>
                <GroupHeading icon={GraduationCap} title="Courses" count={results.courses.length} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.courses.map((c) => (
                    <CourseCard key={c.id} course={c} tilt={false} />
                  ))}
                </div>
              </section>
            )}

            {results.universities.length > 0 && (
              <section>
                <GroupHeading icon={Building2} title="Universities" count={results.universities.length} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {results.universities.map((u) => (
                    <UniversityResult key={u.id} u={u} />
                  ))}
                </div>
              </section>
            )}

            {results.products.length > 0 && (
              <section>
                <GroupHeading icon={ShoppingBag} title="Shop" count={results.products.length} />
                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                  {results.products.map((p) => (
                    <ProductCard key={p.id} product={p} tilt={false} />
                  ))}
                </div>
              </section>
            )}

            {results.exams.length > 0 && (
              <section>
                <GroupHeading icon={ScrollText} title="Exams" count={results.exams.length} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {results.exams.map((e) => (
                    <ExamResult key={e.slug} e={e} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
