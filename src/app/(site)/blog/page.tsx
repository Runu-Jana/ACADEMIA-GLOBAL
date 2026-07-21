import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, Clock, ArrowRight } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Guides on completing your degree, choosing between online and distance learning, and building a career after a study gap.',
}

const posts = [
  {
    title: 'How to Complete Your Degree After a Dropout',
    excerpt: 'A step-by-step route back into formal education — what documents you need, which universities accept broken academic records, and how long it actually takes.',
    date: 'May 20, 2026', read: 7, tag: 'Guides', tone: 'from-primary-500 to-holo-indigo',
  },
  {
    title: 'Best Online Degrees for Working Professionals',
    excerpt: 'Weekend batches, recorded lectures and proctored exams you can sit from home. Here is how to pick a programme that survives a full-time job.',
    date: 'May 18, 2026', read: 6, tag: 'Careers', tone: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Top Government Exams After Graduation',
    excerpt: 'UPSC, SSC CGL, banking and railways — eligibility, realistic timelines, and which degree keeps the most doors open.',
    date: 'May 15, 2026', read: 8, tag: 'Exams', tone: 'from-orange-500 to-rose-500',
  },
  {
    title: 'Online vs Distance Learning: What Actually Differs',
    excerpt: 'Both are recognised. They are not the same thing. A plain comparison of contact hours, exams, fees and who each format really suits.',
    date: 'May 11, 2026', read: 5, tag: 'Explainers', tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    title: 'Is an Online Degree Valid for Government Jobs?',
    excerpt: 'What the UGC regulations actually say about online and distance degrees, and the one thing you must check before you enrol anywhere.',
    date: 'May 6, 2026', read: 6, tag: 'Explainers', tone: 'from-cyan-500 to-blue-500',
  },
  {
    title: 'Funding Your Degree: Scholarships, EMI and Employer Support',
    excerpt: 'Six ways learners cut their tuition bill, including the employer reimbursement route most people never ask about.',
    date: 'May 2, 2026', read: 7, tag: 'Money', tone: 'from-amber-500 to-orange-500',
  },
]

export default function BlogPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="holo" density={2} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">Resources</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            Guides for <span className="holo-text">restarting your education</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[15px] text-muted-foreground">
            Practical, jargon-free writing on degrees, exams and careers in India.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle eyebrow="Latest" title="From the blog" />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.title} delay={i * 60}>
              <TiltCard className="group h-full" intensity={7}>
                <article className="card-base holo-ring holo-ring-hover flex h-full flex-col overflow-hidden hover:shadow-lift">
                  <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${p.tone}`}>
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.4)_0,rgba(255,255,255,.4)_1px,transparent_1px,transparent_14px)]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <Badge tone="default" className="absolute left-3 top-3 border-transparent bg-white/90 text-slate-800">
                      {p.tag}
                    </Badge>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="line-clamp-2 text-[15px] font-extrabold leading-snug transition-colors group-hover:text-primary-600">
                      {p.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {p.excerpt}
                    </p>

                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {p.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {p.read} min read
                      </span>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <p className="mt-10 text-center text-[13px] text-muted-foreground">
          Article pages aren&apos;t wired up yet — connect a CMS or MDX when you&apos;re ready to publish.{' '}
          <Link href="/counsellor" className="font-bold text-primary-600 hover:underline">
            Ask the counsellor instead
          </Link>
        </p>
      </section>
    </>
  )
}
