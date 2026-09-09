import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, FileText, Target, ArrowRight } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'
import { EXAMS } from '@/lib/exams'

export const metadata: Metadata = {
  title: 'Entrance & Competitive Exams',
  description: 'Explore popular entrance and competitive exams in India with eligibility, pattern and preparation guidance.',
}

export default function ExamsPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="cool" density={3} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">Exam Guidance</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            Popular <span className="holo-text">Entrance &amp; Competitive Exams</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-muted-foreground">
            Understand eligibility, timelines and what to study — then pick a degree that keeps
            your options open.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle
          eyebrow="Directory"
          title="Exams at a glance"
          sub="Indicative windows — always confirm dates on the official conducting body’s website."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMS.map((e, i) => (
            <Reveal key={e.name} delay={i * 50}>
              <TiltCard className="group h-full" intensity={7}>
                {/* scroll-mt clears the sticky header when arriving via the
                    /exams#exam-<slug> anchor a search result links to. */}
                <article id={`exam-${e.slug}`} className="card-base holo-ring holo-ring-hover flex h-full scroll-mt-24 flex-col p-5 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[15px] font-extrabold leading-snug">{e.name}</h2>
                    <Badge tone={e.tone}>{e.category}</Badge>
                  </div>

                  <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                    {e.blurb}
                  </p>

                  <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">Eligibility</dt>
                        <dd className="truncate font-bold">{e.level}</dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">Typical window</dt>
                        <dd className="truncate font-bold">{e.window}</dd>
                      </div>
                    </div>
                  </dl>

                  <Link
                    href={`/courses?q=${encodeURIComponent(e.category)}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600 transition-all hover:gap-2.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Related courses
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-[13px] text-muted-foreground">
          Exam patterns and dates change every cycle. Treat this page as orientation, not as
          official notification — always verify with the conducting authority.
        </p>
      </section>
    </>
  )
}
