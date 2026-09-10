import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronRight, Layers, GraduationCap, Clock, Target, Sparkles, ArrowRight, Check, Info,
} from 'lucide-react'
import { getLearningPath, getLearningPathSlugs } from '@/lib/paths'
import { CourseCard } from '@/components/course/course-card'
import { Reveal } from '@/components/fx/reveal'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { JsonLd } from '@/components/seo/json-ld'
import { breadcrumbLd, itemListLd } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { COURSE_LEVELS, STREAMS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const levelLabel = (v: string) => COURSE_LEVELS.find((l) => l.value === v)?.label ?? v
const streamLabel = (v: string) => STREAMS.find((s) => s.value === v)?.label ?? v

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const path = await getLearningPath(slug)
  if (!path) return { title: 'Learning Path Not Found' }

  const description = `${path.subtitle} A guided ${path.courseCount}-course track — ${path.outcome}`
  return {
    title: `${path.title} — Learning Path`,
    description,
    alternates: { canonical: `/paths/${slug}` },
    openGraph: {
      title: `${path.title} — Learning Path`,
      description,
      url: `/paths/${slug}`,
      type: 'website',
    },
  }
}

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const path = await getLearningPath(slug)
  if (!path || path.steps.length === 0) notFound()

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Learning Paths', path: '/paths' },
            { name: path.title, path: `/paths/${path.slug}` },
          ]),
          itemListLd(
            path.steps.map((s) => ({ name: s.course.title, path: `/courses/${s.course.slug}` })),
            path.title,
          ),
        ]}
      />

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <Aurora palette="holo" density={3} />
        <GridPattern className="opacity-25" />
        <div className="container relative z-10 py-9 sm:py-12">
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-white/70">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li><Link href="/paths" className="hover:text-white">Learning Paths</Link></li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li className="text-white/90">{path.title}</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="holo">{streamLabel(path.stream)}</Badge>
              {path.featured && <Badge tone="default" className="border-white/30 text-white">Popular track</Badge>}
            </div>
            <h1 className="mt-3 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {path.title}
            </h1>
            <p className="mt-2.5 max-w-2xl text-pretty text-[15px] text-white/80">{path.subtitle}</p>
            <p className="mt-4 max-w-2xl text-pretty text-[14px] leading-relaxed text-white/70">{path.about}</p>

            {/* stat bar */}
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-semibold">
              <li className="inline-flex items-center gap-1.5">
                <Layers aria-hidden className="h-4 w-4 text-holo-cyan" />
                {path.courseCount} courses
              </li>
              <li className="inline-flex items-center gap-1.5">
                <GraduationCap aria-hidden className="h-4 w-4 text-holo-cyan" />
                {path.levels.map(levelLabel).join(' → ')}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Clock aria-hidden className="h-4 w-4 text-holo-cyan" />
                ~{path.totalYears} {path.totalYears === 1 ? 'year' : 'years'} of study
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container grid gap-10 py-9 sm:py-12 lg:grid-cols-[1fr_18rem] lg:items-start">
        {/* --------------------------------------------------------- steps */}
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold tracking-tight">The track, step by step</h2>
          <p className="mt-1 flex items-start gap-1.5 text-[13px] text-muted-foreground">
            <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Follow it end to end, or start at whichever level fits you. Each course is enrolled and
            paid for on its own page.
          </p>

          <ol className="mt-6 space-y-5">
            {path.steps.map((s, i) => (
              <li key={s.course.id} className="relative">
                <div className="flex gap-4">
                  {/* step index + connector rail */}
                  <div className="flex shrink-0 flex-col items-center">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-600 text-[14px] font-extrabold text-white shadow-glow">
                      {i + 1}
                    </span>
                    {i < path.steps.length - 1 && (
                      <span aria-hidden className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      Step {i + 1} · {levelLabel(s.course.level)}
                    </p>
                    <Reveal>
                      <CourseCard course={s.course} tilt={false} />
                    </Reveal>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* --------------------------------------------------------- aside */}
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="card-base p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight">
              <Target aria-hidden className="h-4 w-4 text-primary-500" />
              Where this gets you
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">{path.outcome}</p>

            {path.skills.length > 0 && (
              <>
                <p className="mt-4 flex items-center gap-2 text-[13px] font-bold">
                  <Sparkles aria-hidden className="h-4 w-4 text-primary-500" />
                  Skills you build
                </p>
                <ul className="mt-2 space-y-1.5">
                  {path.skills.map((sk) => (
                    <li key={sk} className="flex items-start gap-2 text-[13px]">
                      <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{sk}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="card-base bg-muted/30 p-5">
            <p className="text-[13.5px] font-bold">Not sure where to start?</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              A counsellor can map this track to your background and goals.
            </p>
            <Link
              href="/counsellor"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 w-full')}
            >
              Talk to a counsellor
            </Link>
            <Link
              href="/paths"
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 text-[12.5px] font-bold text-primary-600 hover:underline"
            >
              All learning paths
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </section>
    </>
  )
}
