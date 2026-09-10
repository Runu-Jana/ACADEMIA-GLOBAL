import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  Compass, Award, GraduationCap, Check, Minus, ArrowRight, HandCoins, ShieldCheck, HelpCircle,
} from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'
import { cn } from '@/lib/utils'
import { EmiCalculator } from './emi-calculator'

export const metadata: Metadata = {
  title: 'Pricing & Plans',
  description:
    'Simple, transparent pricing on Shiksha Sarthi — free to explore, pay per course for a certificate, or a full UGC-entitled degree with no-cost EMI and scholarships up to 35%.',
  alternates: { canonical: '/pricing' },
}

// Copy lives in messages (pricing.tiers.<mkey>.*); icon/href/accent stay here.
const TIERS = [
  { mkey: 'explore', icon: Compass, features: ['f1', 'f2', 'f3', 'f4', 'f5'], ctaHref: '/courses' },
  { mkey: 'certificate', icon: Award, features: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'], ctaHref: '/courses?level=CERTIFICATE', featured: true },
  { mkey: 'degree', icon: GraduationCap, features: ['f1', 'f2', 'f3', 'f4', 'f5'], ctaHref: '/courses?mode=ONLINE' },
] as const

// Each row: message key + which tiers include it.
const MATRIX: { k: string; on: [boolean, boolean, boolean] }[] = [
  { k: 'browse', on: [true, true, true] },
  { k: 'ai', on: [true, true, true] },
  { k: 'videos', on: [false, true, true] },
  { k: 'live', on: [false, true, true] },
  { k: 'tests', on: [false, true, true] },
  { k: 'certificate', on: [false, true, true] },
  { k: 'degree', on: [false, false, true] },
  { k: 'placement', on: [false, false, true] },
  { k: 'emi', on: [false, true, true] },
  { k: 'scholarships', on: [false, true, true] },
]

const FAQS: { key: string; href?: string }[] = [
  { key: 'explore' },
  { key: 'fee' },
  { key: 'emi', href: '/scholarships' },
  { key: 'scholarship', href: '/scholarships' },
  { key: 'recognition', href: '/verify' },
]

export default async function PricingPage() {
  const t = await getTranslations('pricing')
  const th = await getTranslations('header')

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="cool" density={3} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">{t('badge')}</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            {t.rich('title', { accent: (chunks) => <span className="holo-text">{chunks}</span> })}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- tier cards */}
      <section className="container py-12">
        <div className="grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon
            const featured = 'featured' in tier && tier.featured
            return (
              <Reveal key={tier.mkey} delay={i * 70}>
                <TiltCard className="group h-full" intensity={5}>
                  <article
                    className={cn(
                      'card-base holo-ring holo-ring-hover relative flex h-full flex-col p-6',
                      featured && 'ring-2 ring-primary-500/40',
                    )}
                  >
                    {featured && (
                      <Badge tone="holo" className="absolute -top-3 left-6 shadow-sm">
                        {t('mostPopular')}
                      </Badge>
                    )}
                    <span
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-2xl',
                        featured ? 'bg-holo-sweep text-white' : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-3.5 font-display text-lg font-extrabold">{t(`tiers.${tier.mkey}.name`)}</h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">{t(`tiers.${tier.mkey}.tagline`)}</p>

                    <div className="mt-4">
                      <p className="font-display text-2xl font-extrabold tracking-tight text-primary-700 dark:text-primary-300">
                        {t(`tiers.${tier.mkey}.price`)}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{t(`tiers.${tier.mkey}.priceNote`)}</p>
                    </div>

                    <ul className="mt-5 flex-1 space-y-2.5">
                      {tier.features.map((fk) => (
                        <li key={fk} className="flex items-start gap-2 text-[13px]">
                          <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                          <span>{t(`tiers.${tier.mkey}.${fk}`)}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={tier.ctaHref}
                      className={buttonVariants({ variant: featured ? 'holo' : 'outline', className: 'mt-6 w-full' })}
                    >
                      {t(`tiers.${tier.mkey}.cta`)}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                </TiltCard>
              </Reveal>
            )
          })}
        </div>
        <p className="mt-6 text-center text-[12.5px] text-muted-foreground">{t('feesNote')}</p>
      </section>

      {/* ----------------------------------------------------- EMI calculator */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="container">
          <SectionTitle eyebrow={t('emi.eyebrow')} title={t('emi.title')} sub={t('emi.sub')} />
          <Reveal>
            <EmiCalculator />
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------- comparison table */}
      <section className="container py-12">
        <SectionTitle eyebrow={t('compare.eyebrow')} title={t('compare.title')} sub={t('compare.sub')} />
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('compare.feature')}
                  </th>
                  {(['colExplore', 'colCertificate', 'colDegree'] as const).map((c) => (
                    <th key={c} className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t(`compare.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MATRIX.map((row) => (
                  <tr key={row.k} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-[13px] font-medium">{t(`compare.${row.k}`)}</td>
                    {row.on.map((on, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {on ? (
                          <Check aria-label={t('compare.included')} className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <Minus aria-label={t('compare.notIncluded')} className="mx-auto h-4 w-4 text-muted-foreground/40" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- scholarships band */}
      <section className="container pb-12">
        <div className="holo-ring relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-50 via-holo-cyan/10 to-white p-6 dark:from-primary-500/10 dark:via-holo-violet/10 dark:to-transparent sm:p-8">
          <div aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-holo-sweep opacity-20 blur-2xl" />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
                <HandCoins className="h-5 w-5 text-primary-600" />
                {t('band.title')}
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{t('band.body')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/scholarships" className={buttonVariants({ variant: 'primary' })}>
                {t('band.seeScholarships')}
              </Link>
              <Link href="/counsellor" className={buttonVariants({ variant: 'outline' })}>
                {th('askSarthi')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <section className="container pb-16">
        <SectionTitle eyebrow={t('faq.eyebrow')} title={t('faq.title')} />
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQS.map((item) => (
            <details key={item.key} className="card-base group overflow-hidden [&_summary]:list-none">
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-[14px] font-bold">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 shrink-0 text-primary-500" />
                  {t(`faq.${item.key}Q`)}
                </span>
                <span className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="border-t border-border px-4 pb-4 pt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                {t.rich(`faq.${item.key}A`, {
                  link: (chunks) =>
                    item.href ? (
                      <Link href={item.href} className="font-semibold text-primary-600 hover:underline">
                        {chunks}
                      </Link>
                    ) : (
                      <>{chunks}</>
                    ),
                })}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary-500" />
            {t('noFees')}
          </p>
          <Link href="/courses" className={buttonVariants({ variant: 'holo' })}>
            {t('exploreCourses')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
