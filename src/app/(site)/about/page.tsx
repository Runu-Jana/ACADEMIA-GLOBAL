import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Building2, Users, BookOpen, ShieldCheck, Target, Heart, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { liveCourseWhere, liveUniversityWhere } from '@/lib/visibility'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CountUp } from '@/components/fx/count-up'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora, GridPattern } from '@/components/fx/aurora'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Shiksha Sarthi helps learners across India restart, continue and complete their education.',
}

export const revalidate = 300

const values = [
  { key: 'guidance', icon: Target, tone: 'from-primary-500 to-holo-indigo' },
  { key: 'recognised', icon: ShieldCheck, tone: 'from-emerald-500 to-teal-500' },
  { key: 'secondChances', icon: Heart, tone: 'from-rose-500 to-fuchsia-500' },
] as const

const faqKeys = ['govtJobs', 'dropout', 'delivery', 'charge'] as const

export default async function AboutPage() {
  const t = await getTranslations('about')
  const [universities, courses, students] = await Promise.all([
    prisma.university.count({ where: liveUniversityWhere }),
    prisma.course.count({ where: liveCourseWhere }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
  ])

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="brand" density={3} />
        <GridPattern />
        <div className="container relative py-16 text-center">
          <Badge tone="holo" className="mb-4">{t('badge')}</Badge>
          <h1 className="mx-auto max-w-3xl text-balance font-display text-3xl font-extrabold leading-tight sm:text-[2.75rem]">
            {t.rich('title', { accent: (chunks) => <span className="holo-text">{chunks}</span> })}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
            {t('sub')}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-7 shadow-soft sm:grid-cols-4">
          {[
            { icon: Building2, to: universities, suffix: '+', label: t('statUniversities') },
            { icon: BookOpen, to: courses, suffix: '+', label: t('statProgrammes') },
            { icon: Users, to: students, suffix: '+', label: t('statLearners') },
            { icon: ShieldCheck, to: 100, suffix: '%', label: t('statRecognised') },
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
        <SectionTitle center eyebrow={t('valuesEyebrow')} title={t('valuesTitle')} />
        <div className="grid gap-5 lg:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.key} delay={i * 80}>
              <TiltCard className="group h-full" intensity={8}>
                <article className="card-base holo-ring holo-ring-hover h-full p-6 hover:shadow-lift">
                  <span
                    className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${v.tone} shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}
                  >
                    <v.icon className="h-5 w-5 text-white" />
                  </span>
                  <h3 className="text-[15px] font-extrabold">{t(`values.${v.key}.title`)}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t(`values.${v.key}.body`)}</p>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle center eyebrow={t('faqsEyebrow')} title={t('faqsTitle')} />
        <div className="mx-auto max-w-3xl space-y-3">
          {faqKeys.map((k, i) => (
            <Reveal key={k} delay={i * 60}>
              <details className="card-base group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[14px] font-bold marker:hidden">
                  {t(`faqs.${k}.q`)}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="border-t border-border p-5 text-[13px] leading-relaxed text-muted-foreground">
                  {t(`faqs.${k}.a`)}
                </p>
              </details>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/counsellor" className={buttonVariants({ variant: 'holo', size: 'lg' })}>
            {t('cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
