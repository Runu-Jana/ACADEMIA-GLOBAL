import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Building2, TrendingUp, ShieldCheck, UploadCloud, BadgeCheck, Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { Reveal } from '@/components/fx/reveal'
import { PartnerApplyForm } from './partner-apply-form'

export const metadata: Metadata = {
  title: 'Partner with Academia Global',
  description:
    'List your university’s online and distance programmes on Academia Global. Reach lakhs of learners across India, submit programmes yourself, and pay only for admissions we send you.',
}

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Admissions, not just clicks',
    body: 'Reach learners actively choosing a programme. You pay a commission per confirmed admission — never for traffic.',
  },
  {
    icon: UploadCloud,
    title: 'You own your catalogue',
    body: 'Submit and update your own programmes from a partner portal — or upload a prospectus and let our AI draft them for you.',
  },
  {
    icon: ShieldCheck,
    title: 'Recognised programmes only',
    body: 'A quality bar students trust: every listing is reviewed before it goes live, so your name sits alongside credible peers.',
  },
]

const STEPS = [
  { n: 1, title: 'Apply', body: 'Tell us about your institution and the programmes you offer.' },
  { n: 2, title: 'Get approved', body: 'Our team reviews your institution and activates your partner portal.' },
  { n: 3, title: 'List & go live', body: 'Add programmes yourself; each goes live once reviewed.' },
]

export default async function ForUniversitiesPage() {
  const user = await getCurrentUser()
  // A signed-in partner belongs in their portal, not on the sales page.
  if (user?.role === 'PARTNER') redirect('/partner')

  return (
    <div className="relative">
      {/* --------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <Aurora palette="holo" density={3} />
        <GridPattern className="opacity-30" />

        <div className="container relative z-10 grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                <Building2 className="h-3.5 w-3.5" />
                For Universities & Institutions
              </span>
              <h1 className="text-balance text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.9rem]">
                List your programmes where <span className="holo-text-bright">India is choosing</span> to study
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-[15px] text-white/85">
                Academia Global connects recognised universities with learners restarting, continuing
                and completing their education. Onboard once, manage your own catalogue, and pay only
                for the admissions we send you.
              </p>

              <ol className="mt-8 grid gap-3 sm:grid-cols-3">
                {STEPS.map((s) => (
                  <li key={s.n} className="rounded-2xl border border-white/15 bg-white/5 p-3.5 backdrop-blur-sm">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-[13px] font-extrabold">
                      {s.n}
                    </span>
                    <p className="mt-2 text-[13.5px] font-bold">{s.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-white/70">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          {/* ------------------------------------------------------------ form */}
          <Reveal delay={120}>
            <div className="card-base holo-ring bg-card/95 p-5 text-foreground shadow-2xl backdrop-blur-sm sm:p-6">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
                  <Sparkles className="h-5 w-5 text-primary-500" />
                  Become a partner
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Takes two minutes. No cost to apply.
                </p>
              </div>
              <PartnerApplyForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- benefits */}
      <section className="container py-12 sm:py-14">
        <div className="grid gap-5 sm:grid-cols-3">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon
            return (
              <Reveal key={b.title} delay={i * 70}>
                <div className="card-base holo-ring-hover holo-ring h-full p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-holo-sweep text-white shadow-glow">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3.5 text-[15px] font-bold">{b.title}</h3>
                  <p className="mt-1.5 text-pretty text-[13px] leading-relaxed text-muted-foreground">
                    {b.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted/40 p-6 text-center">
          <BadgeCheck className="h-7 w-7 text-primary-500" />
          <p className="max-w-xl text-pretty text-[13.5px] text-muted-foreground">
            Already partnered with us?{' '}
            <a href="/login" className="font-bold text-primary-600 hover:underline">
              Sign in to your partner portal
            </a>{' '}
            to manage your programmes.
          </p>
        </div>
      </section>
    </div>
  )
}
