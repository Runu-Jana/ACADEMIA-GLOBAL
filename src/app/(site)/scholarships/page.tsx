import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Award, CreditCard, GraduationCap, HandCoins, Percent, Users } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'

export const metadata: Metadata = {
  title: 'Scholarships & EMI Options',
  description: 'Merit, need-based and category scholarships plus no-cost EMI options to make your degree affordable.',
}

// Presentation only — the label, eligibility and waiver copy come from the
// `scholarships.schemes.<slug>` messages, keyed by slug; `pct` fills the shared
// "Up to {pct}% off" template.
const schemes = [
  { slug: 'merit', icon: Award, pct: 30, tone: 'from-amber-400 to-orange-500' },
  { slug: 'need', icon: HandCoins, pct: 25, tone: 'from-emerald-400 to-teal-500' },
  { slug: 'defence', icon: Users, pct: 20, tone: 'from-sky-400 to-blue-500' },
  { slug: 'alumni', icon: GraduationCap, pct: 15, tone: 'from-violet-400 to-purple-500' },
  { slug: 'earlyBird', icon: Percent, pct: 10, tone: 'from-pink-400 to-rose-500' },
  { slug: 'divyang', icon: CreditCard, pct: 25, tone: 'from-cyan-400 to-teal-500' },
] as const

export default async function ScholarshipsPage() {
  const t = await getTranslations('scholarships')
  const emiSteps = [t('emiStep1'), t('emiStep2'), t('emiStep3'), t('emiStep4')]

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="warm" density={3} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">{t('badge')}</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            {t.rich('title', { accent: (chunks) => <span className="holo-text">{chunks}</span> })}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-muted-foreground">
            {t('sub')}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle
          eyebrow={t('sectionEyebrow')}
          title={t('sectionTitle')}
          sub={t('sectionSub')}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((s, i) => (
            <Reveal key={s.slug} delay={i * 60}>
              <TiltCard className="group h-full" intensity={8}>
                <article className="card-base holo-ring holo-ring-hover flex h-full flex-col p-5 hover:shadow-lift">
                  <span
                    className={`mb-3.5 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${s.tone} shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}
                  >
                    <s.icon className="h-5 w-5 text-white" />
                  </span>
                  <h2 className="text-[15px] font-extrabold">{t(`schemes.${s.slug}.title`)}</h2>
                  <p className="mt-1 text-lg font-extrabold text-primary-600 dark:text-primary-300">
                    {t('cut', { pct: String(s.pct) })}
                  </p>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                    {t(`schemes.${s.slug}.who`)}
                  </p>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container pb-14">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="card-base h-full p-6">
              <h2 className="font-display text-xl font-extrabold">{t('emiTitle')}</h2>
              <ol className="mt-5 space-y-4">
                {emiSteps.map((step, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-600 text-[12px] font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-[13px] leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="holo-ring relative flex h-full flex-col justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-50 via-holo-cyan/10 to-white p-6 dark:from-primary-500/10 dark:via-holo-violet/10 dark:to-transparent">
              <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-holo-sweep opacity-20 blur-2xl" />
              <h2 className="relative font-display text-xl font-extrabold">
                {t('helpTitle')}
              </h2>
              <p className="relative mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {t('helpBody')}
              </p>
              <div className="relative mt-6 flex flex-wrap gap-3">
                <Link href="/counsellor" className={buttonVariants({ variant: 'holo' })}>
                  {t('checkEligibility')}
                </Link>
                <Link href="/courses" className={buttonVariants({ variant: 'outline' })}>
                  {t('browseCourses')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        <p className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-[13px] text-muted-foreground">
          {t('disclaimer')}
        </p>
      </section>
    </>
  )
}
