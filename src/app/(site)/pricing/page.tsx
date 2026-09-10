import type { Metadata } from 'next'
import Link from 'next/link'
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

type Tier = {
  name: string
  price: string
  priceNote: string
  tagline: string
  icon: React.ElementType
  features: string[]
  cta: { label: string; href: string }
  featured?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Explore',
    price: 'Free',
    priceNote: 'No card, no commitment',
    tagline: 'See everything before you decide.',
    icon: Compass,
    features: [
      'Browse every programme & university',
      'Ask Sarthi — your AI course counsellor',
      'Compare courses side by side',
      'Entrance-exam guidance',
      'Download brochures & apply',
    ],
    cta: { label: 'Browse courses', href: '/courses' },
  },
  {
    name: 'Certificate Courses',
    price: 'Pay per course',
    priceNote: 'One fee, everything included',
    tagline: 'Learn a skill, earn a certificate.',
    icon: Award,
    featured: true,
    features: [
      'Everything in Explore',
      'Full video lessons & study material',
      'Live classes & doubt support',
      'Tests, assignments & the AI tutor',
      'Verifiable certificate on completion',
      'No-cost EMI available',
    ],
    cta: { label: 'Find a course', href: '/courses?level=CERTIFICATE' },
  },
  {
    name: 'Degree Programmes',
    price: 'Full tuition',
    priceNote: 'Per-year fees or EMI',
    tagline: 'UGC-entitled online & distance degrees.',
    icon: GraduationCap,
    features: [
      'Everything in Certificate Courses',
      'UGC-entitled UG & PG degrees',
      'Placement support',
      'Scholarships up to 35% off',
      'Pay per year or split into EMI',
    ],
    cta: { label: 'Explore degrees', href: '/courses?mode=ONLINE' },
  },
]

const COLUMNS = ['Explore', 'Certificate', 'Degree'] as const

const MATRIX: { label: string; on: [boolean, boolean, boolean] }[] = [
  { label: 'Browse & compare programmes', on: [true, true, true] },
  { label: 'Ask Sarthi — AI counsellor', on: [true, true, true] },
  { label: 'Video lessons & study material', on: [false, true, true] },
  { label: 'Live classes & doubt support', on: [false, true, true] },
  { label: 'Tests, assignments & AI tutor', on: [false, true, true] },
  { label: 'Verifiable certificate', on: [false, true, true] },
  { label: 'UGC-entitled degree', on: [false, false, true] },
  { label: 'Placement support', on: [false, false, true] },
  { label: 'No-cost EMI', on: [false, true, true] },
  { label: 'Scholarships up to 35%', on: [false, true, true] },
]

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Is it really free to explore?',
    a: 'Yes. Browsing the catalogue, comparing programmes, chatting with Sarthi and applying all cost nothing. You only pay when you enrol in a course.',
  },
  {
    q: 'What does a course fee cover?',
    a: 'The fee shown on each course covers all of it — video lessons, live classes, study material, tests and assignments, the AI tutor, and a verifiable certificate on completion.',
  },
  {
    q: 'How does EMI work?',
    a: (
      <>
        Eligible programmes offer no-cost EMI over 3, 6, 9 or 12 months through our partner lenders. You
        pay only the first instalment to enrol. Try the calculator above, and see{' '}
        <Link href="/scholarships" className="font-semibold text-primary-600 hover:underline">
          Scholarships &amp; EMI
        </Link>{' '}
        for details.
      </>
    ),
  },
  {
    q: 'Can I get a scholarship?',
    a: (
      <>
        Merit, need-based and category scholarships can reduce tuition by up to 35%. Check what you
        qualify for on the{' '}
        <Link href="/scholarships" className="font-semibold text-primary-600 hover:underline">
          Scholarships
        </Link>{' '}
        page.
      </>
    ),
  },
  {
    q: 'Are the certificates and degrees recognised?',
    a: (
      <>
        Our degree programmes are UGC-entitled, and every certificate we issue is verifiable online at{' '}
        <Link href="/verify" className="font-semibold text-primary-600 hover:underline">
          Verify Certificate
        </Link>
        .
      </>
    ),
  },
]

function TierCard({ tier }: { tier: Tier }) {
  const Icon = tier.icon
  return (
    <article
      className={cn(
        'card-base holo-ring holo-ring-hover relative flex h-full flex-col p-6',
        tier.featured && 'ring-2 ring-primary-500/40',
      )}
    >
      {tier.featured && (
        <Badge tone="holo" className="absolute -top-3 left-6 shadow-sm">
          Most popular
        </Badge>
      )}
      <span
        className={cn(
          'grid h-11 w-11 place-items-center rounded-2xl',
          tier.featured ? 'bg-holo-sweep text-white' : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3.5 font-display text-lg font-extrabold">{tier.name}</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">{tier.tagline}</p>

      <div className="mt-4">
        <p className="font-display text-2xl font-extrabold tracking-tight text-primary-700 dark:text-primary-300">
          {tier.price}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{tier.priceNote}</p>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px]">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={tier.cta.href}
        className={buttonVariants({
          variant: tier.featured ? 'holo' : 'outline',
          className: 'mt-6 w-full',
        })}
      >
        {tier.cta.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

export default function PricingPage() {
  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="cool" density={3} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">Pricing</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            Simple, <span className="holo-text">transparent pricing</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-muted-foreground">
            Start free, pay only when you enrol, and split any fee into no-cost EMI. No hidden charges —
            the price you see on a course is the price you pay.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- tier cards */}
      <section className="container py-12">
        <div className="grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 70}>
              <TiltCard className="group h-full" intensity={5}>
                <TierCard tier={tier} />
              </TiltCard>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
          Exact fees vary by programme and university — open any course to see its fee, discounts and EMI options.
        </p>
      </section>

      {/* ----------------------------------------------------- EMI calculator */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="container">
          <SectionTitle
            eyebrow="No-cost EMI"
            title="Split your fee, interest-free"
            sub="Estimate your monthly instalment. No-cost EMI means the total never exceeds the fee."
          />
          <Reveal>
            <EmiCalculator />
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------- comparison table */}
      <section className="container py-12">
        <SectionTitle eyebrow="Compare" title="What's included" sub="Everything unlocks the moment you enrol." />
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    Feature
                  </th>
                  {COLUMNS.map((c) => (
                    <th key={c} className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MATRIX.map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-[13px] font-medium">{row.label}</td>
                    {row.on.map((on, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {on ? (
                          <Check aria-label="Included" className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <Minus aria-label="Not included" className="mx-auto h-4 w-4 text-muted-foreground/40" />
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
                Bring the price down further
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                Combine a scholarship of up to 35% with no-cost EMI. Tell our counsellor your marks,
                category and budget, and we'll shortlist the programmes where your total outgo is lowest.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/scholarships" className={buttonVariants({ variant: 'primary' })}>
                See scholarships
              </Link>
              <Link href="/counsellor" className={buttonVariants({ variant: 'outline' })}>
                Ask Sarthi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <section className="container pb-16">
        <SectionTitle eyebrow="FAQ" title="Questions about paying" />
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="card-base group overflow-hidden [&_summary]:list-none">
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-[14px] font-bold">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 shrink-0 text-primary-500" />
                  {item.q}
                </span>
                <span className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="border-t border-border px-4 pb-4 pt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary-500" />
            No hidden fees. Cancel an unpaid application any time.
          </p>
          <Link href="/courses" className={buttonVariants({ variant: 'holo' })}>
            Explore courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
