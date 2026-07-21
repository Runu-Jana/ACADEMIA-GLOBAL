import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Users, BookOpen, ShieldCheck, Target, Heart, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CountUp } from '@/components/fx/count-up'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora, GridPattern } from '@/components/fx/aurora'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Academia Global helps learners across India restart, continue and complete their education.',
}

export const revalidate = 300

const values = [
  { icon: Target, title: 'Guidance before selling', body: 'We start by understanding where you stopped and why — not by pushing whichever programme pays us most.', tone: 'from-primary-500 to-holo-indigo' },
  { icon: ShieldCheck, title: 'Only recognised degrees', body: 'Every programme listed is UGC-entitled, UGC-DEB approved or AICTE approved. If it isn’t recognised, it isn’t here.', tone: 'from-emerald-500 to-teal-500' },
  { icon: Heart, title: 'Built for second chances', body: 'Dropouts, career switchers, working parents. The people mainstream admissions quietly leave behind.', tone: 'from-rose-500 to-fuchsia-500' },
]

const faqs = [
  { q: 'Are these degrees valid for government jobs?', a: 'Yes. UGC-entitled online and UGC-DEB approved distance degrees hold the same status as on-campus degrees for employment and higher study, per UGC regulations.' },
  { q: 'I dropped out years ago. Can I still continue?', a: 'In most cases yes. Open universities accept learners without an unbroken academic record, and several programmes have no upper age limit. Tell the counsellor your last completed level and we will map the options.' },
  { q: 'How are classes delivered?', a: 'Online programmes combine live sessions with recorded lectures, downloadable notes and assignments — all available in your dashboard. Distance programmes are self-paced with study material and term-end exams.' },
  { q: 'What does Academia Global charge me?', a: 'Nothing for counselling or admission support. You pay the university’s fee directly; we earn a referral fee from partner institutions.' },
]

export default async function AboutPage() {
  const [universities, courses, students] = await Promise.all([
    prisma.university.count(),
    prisma.course.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
  ])

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="brand" density={3} />
        <GridPattern />
        <div className="container relative py-16 text-center">
          <Badge tone="holo" className="mb-4">Our Story</Badge>
          <h1 className="mx-auto max-w-3xl text-balance font-display text-3xl font-extrabold leading-tight sm:text-[2.75rem]">
            Education shouldn&apos;t end because{' '}
            <span className="holo-text">life got in the way</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Millions of Indians leave formal education for reasons that have nothing to do with
            ability — money, family, illness, a job that couldn&apos;t wait. Academia Global exists
            to help them pick it back up, from Class 10 all the way to postgraduate study.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-7 shadow-soft sm:grid-cols-4">
          {[
            { icon: Building2, to: universities, suffix: '+', label: 'Partner Universities' },
            { icon: BookOpen, to: courses, suffix: '+', label: 'Programmes Listed' },
            { icon: Users, to: students, suffix: '+', label: 'Registered Learners' },
            { icon: ShieldCheck, to: 100, suffix: '%', label: 'Recognised Degrees' },
          ].map(({ icon: Icon, to, suffix, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-extrabold leading-tight">
                  <CountUp to={to} suffix={suffix} />
                </p>
                <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-8">
        <SectionTitle center eyebrow="What we stand for" title="How we work" />
        <div className="grid gap-5 lg:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 80}>
              <TiltCard className="group h-full" intensity={8}>
                <article className="card-base holo-ring holo-ring-hover h-full p-6 hover:shadow-lift">
                  <span
                    className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${v.tone} shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}
                  >
                    <v.icon className="h-5 w-5 text-white" />
                  </span>
                  <h3 className="text-[15px] font-extrabold">{v.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{v.body}</p>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle center eyebrow="FAQs" title="Questions we get a lot" />
        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="card-base group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[14px] font-bold marker:hidden">
                  {f.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="border-t border-border p-5 text-[13px] leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/counsellor" className={buttonVariants({ variant: 'holo', size: 'lg' })}>
            Talk to a counsellor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
