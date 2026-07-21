import type { Metadata } from 'next'
import Link from 'next/link'
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

const schemes = [
  { icon: Award, title: 'Merit Scholarship', cut: 'Up to 30% off', who: 'Students with 75%+ in their qualifying exam', tone: 'from-amber-400 to-orange-500' },
  { icon: HandCoins, title: 'Need-Based Aid', cut: 'Up to 25% off', who: 'Family income below ₹4 LPA, with income proof', tone: 'from-emerald-400 to-teal-500' },
  { icon: Users, title: 'Defence & Kin', cut: 'Up to 20% off', who: 'Serving/retired defence personnel and their dependants', tone: 'from-sky-400 to-blue-500' },
  { icon: GraduationCap, title: 'Alumni Continuation', cut: 'Up to 15% off', who: 'Learners returning for a second programme', tone: 'from-violet-400 to-purple-500' },
  { icon: Percent, title: 'Early Bird', cut: 'Up to 10% off', who: 'Applications completed before the session cut-off', tone: 'from-pink-400 to-rose-500' },
  { icon: CreditCard, title: 'Divyangjan Support', cut: 'Up to 25% off', who: 'Students with 40%+ benchmark disability certification', tone: 'from-cyan-400 to-teal-500' },
]

const emiSteps = [
  'Pick your programme and start the admission form.',
  'Choose "Pay in instalments" at the fee step.',
  'Select a 3, 6, 9 or 12-month plan from a partner lender.',
  'Complete a one-time verification and pay only the first instalment to enrol.',
]

export default function ScholarshipsPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="warm" density={3} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">Fee Support</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            Scholarships &amp; <span className="holo-text">Flexible EMI</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-muted-foreground">
            Cost should not decide whether you finish your education. Combine a scholarship with a
            no-cost instalment plan and start this session.
          </p>
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle
          eyebrow="Scholarships"
          title="Ways to reduce your fees"
          sub="Waivers are applied to tuition, are not stackable beyond 35% in total, and are confirmed after document verification."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <TiltCard className="group h-full" intensity={8}>
                <article className="card-base holo-ring holo-ring-hover flex h-full flex-col p-5 hover:shadow-lift">
                  <span
                    className={`mb-3.5 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${s.tone} shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}
                  >
                    <s.icon className="h-5 w-5 text-white" />
                  </span>
                  <h2 className="text-[15px] font-extrabold">{s.title}</h2>
                  <p className="mt-1 text-lg font-extrabold text-primary-600 dark:text-primary-300">
                    {s.cut}
                  </p>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                    {s.who}
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
              <h2 className="font-display text-xl font-extrabold">How EMI works</h2>
              <ol className="mt-5 space-y-4">
                {emiSteps.map((step, i) => (
                  <li key={step} className="flex gap-3.5">
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
                Not sure what you qualify for?
              </h2>
              <p className="relative mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Tell our counsellor your marks, category and budget, and we&apos;ll shortlist the
                programmes where your total outgo is lowest.
              </p>
              <div className="relative mt-6 flex flex-wrap gap-3">
                <Link href="/counsellor" className={buttonVariants({ variant: 'holo' })}>
                  Check my eligibility
                </Link>
                <Link href="/courses" className={buttonVariants({ variant: 'outline' })}>
                  Browse courses
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        <p className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-[13px] text-muted-foreground">
          Indicative waivers shown for guidance. Final scholarship amounts are decided by the
          awarding university after document verification.
        </p>
      </section>
    </>
  )
}
