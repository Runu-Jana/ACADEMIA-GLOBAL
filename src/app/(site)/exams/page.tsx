import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, FileText, Target, ArrowRight } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'

export const metadata: Metadata = {
  title: 'Entrance & Competitive Exams',
  description: 'Explore popular entrance and competitive exams in India with eligibility, pattern and preparation guidance.',
}

const exams = [
  { name: 'UPSC Civil Services', category: 'Government', level: 'Graduation', window: 'Feb – Sep', tone: 'primary' as const, blurb: 'India’s premier civil services examination for IAS, IPS and allied services.' },
  { name: 'NEET UG', category: 'Medical', level: 'After 12th', window: 'May', tone: 'danger' as const, blurb: 'Single entrance test for MBBS, BDS and AYUSH admissions across India.' },
  { name: 'JEE Main', category: 'Engineering', level: 'After 12th', window: 'Jan & Apr', tone: 'violet' as const, blurb: 'Gateway to NITs, IIITs and the JEE Advanced qualifier for the IITs.' },
  { name: 'CAT', category: 'Management', level: 'Graduation', window: 'Nov', tone: 'cyan' as const, blurb: 'The common admission test for IIMs and top B-schools nationwide.' },
  { name: 'CLAT', category: 'Law', level: 'After 12th', window: 'Dec', tone: 'warning' as const, blurb: 'Common law admission test for the National Law Universities.' },
  { name: 'CUET UG', category: 'Central Universities', level: 'After 12th', window: 'May – Jun', tone: 'success' as const, blurb: 'Common entrance for undergraduate admissions to central universities.' },
  { name: 'SSC CGL', category: 'Government', level: 'Graduation', window: 'Jun – Sep', tone: 'primary' as const, blurb: 'Combined graduate level exam for Group B and C posts in central ministries.' },
  { name: 'IBPS PO (Banking)', category: 'Banking', level: 'Graduation', window: 'Aug – Nov', tone: 'orange' as const, blurb: 'Probationary officer recruitment across public sector banks.' },
  { name: 'RRB NTPC (Railway)', category: 'Government', level: '12th / Graduation', window: 'Varies', tone: 'default' as const, blurb: 'Non-technical popular categories recruitment for Indian Railways.' },
  { name: 'Haryana CET', category: 'State', level: '12th / Graduation', window: 'Varies', tone: 'success' as const, blurb: 'Common eligibility test for Group C and D posts in Haryana.' },
]

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
          {exams.map((e, i) => (
            <Reveal key={e.name} delay={i * 50}>
              <TiltCard className="group h-full" intensity={7}>
                <article className="card-base holo-ring holo-ring-hover flex h-full flex-col p-5 hover:shadow-lift">
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
