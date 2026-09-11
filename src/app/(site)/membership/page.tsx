import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  Sparkles, Check, BadgeCheck, CalendarClock, ArrowRight, ShieldCheck,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import {
  MEMBERSHIP_PLANS, getActiveMembership, perMonthPaise, savingsPct,
} from '@/lib/membership'
import { formatPaise } from '@/lib/shop'
import { formatDate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'
import { MembershipCheckout } from '@/components/membership/membership-checkout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'All-Access Membership',
  description:
    'One pass, every platform course. Unlimited enrolment in Shiksha Sarthi platform courses with video lessons, live classes, mock tests and the AI tutor — a simple fixed-term pass, no auto-renewal.',
  alternates: { canonical: '/membership' },
}

// Shared across every plan — the value is the access, not the billing period.
const INCLUDED = ['f1', 'f2', 'f3', 'f4', 'f5'] as const

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string }>
}) {
  const t = await getTranslations('membership')
  const { joined } = await searchParams

  const me = await getCurrentUser()
  const active = me ? await getActiveMembership(me.id) : null

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="warm" density={3} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">
            <Sparkles className="h-3 w-3" />
            {t('badge')}
          </Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            {t.rich('title', { accent: (chunks) => <span className="holo-text">{chunks}</span> })}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <div className="container py-12">
        {/* --------------------------------------------------- joined banner */}
        {joined && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
            <BadgeCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[14px] font-extrabold text-emerald-800 dark:text-emerald-200">{t('joined.title')}</p>
              <p className="mt-0.5 text-[13px] text-emerald-700/90 dark:text-emerald-300/90">{t('joined.body')}</p>
            </div>
          </div>
        )}

        {/* --------------------------------------------------- active status */}
        {active && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary-200 bg-primary-50/70 p-5 dark:border-primary-500/25 dark:bg-primary-500/10">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-holo-sweep text-white">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[14px] font-extrabold">{t('active.label')}</p>
                <p className="text-[13px] text-muted-foreground">
                  {t('active.until', { date: formatDate(active.expiresAt!) })}
                </p>
              </div>
            </div>
            <Link href="/courses?access=platform" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              {t('active.browse')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* -------------------------------------------------------- plan cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {MEMBERSHIP_PLANS.map((plan, i) => {
            const featured = Boolean(plan.popular)
            const save = savingsPct(plan)
            return (
              <Reveal key={plan.id} delay={i * 70}>
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

                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg font-extrabold">{t(`plans.${plan.id}.name`)}</h3>
                      {save > 0 && (
                        <span className="rounded-full bg-accent-green/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          {t('save', { pct: save })}
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="font-display text-3xl font-extrabold tracking-tight text-primary-700 dark:text-primary-300">
                        {formatPaise(plan.price)}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t(`plans.${plan.id}.term`)}</p>
                      <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
                        {t('perMonth', { amount: formatPaise(perMonthPaise(plan)) })}
                      </p>
                    </div>

                    <p className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                      <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-primary-500" />
                      {t('oneTime')}
                    </p>

                    <div className="mt-auto">
                      <MembershipCheckout planId={plan.id} signedIn={Boolean(me)} featured={featured} />
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            )
          })}
        </div>

        {/* ---------------------------------------------------- what's included */}
        <section className="mt-12 rounded-3xl border border-border bg-muted/30 p-6 sm:p-8">
          <h2 className="font-display text-xl font-extrabold tracking-tight">{t('included.heading')}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((fk) => (
              <li key={fk} className="flex items-start gap-2.5 text-[13.5px]">
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                <span>{t(`included.${fk}`)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-xl border border-dashed border-border bg-card/60 p-4 text-[12.5px] leading-relaxed text-muted-foreground">
            {t.rich('notePlatform', {
              link: (chunks) => (
                <Link href="/courses?mode=ONLINE" className="font-semibold text-primary-600 hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </section>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <Link href="/courses" className={buttonVariants({ variant: 'holo' })}>
            {t('exploreCourses')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  )
}
