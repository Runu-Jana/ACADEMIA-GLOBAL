import Link from 'next/link'
import {
  ShieldCheck, CreditCard, Award, Lock, Briefcase, Headset,
  Check, Smartphone, ArrowRight, Quote, CalendarDays, HelpCircle,
} from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { POPULAR_EXAMS } from '@/lib/constants'

// --------------------------------------------------------------- trust strip

const badges = [
  { icon: ShieldCheck, title: 'UGC Approved', sub: 'Recognized Degrees' },
  { icon: CreditCard, title: 'Easy EMI Options', sub: 'Flexible Installments' },
  { icon: Award, title: 'Scholarships', sub: 'For Eligible Students' },
  { icon: Lock, title: '100% Secure', sub: 'Admission Process' },
  { icon: Briefcase, title: 'Placement Support', sub: 'Career Assistance' },
  { icon: Headset, title: '24/7 Support', sub: 'We are here to help' },
]

export function TrustStrip() {
  return (
    <section className="container py-8">
      <div className="grid gap-x-4 gap-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft sm:grid-cols-3 lg:grid-cols-6">
        {badges.map(({ icon: Icon, title, sub }, i) => (
          <Reveal key={title} delay={i * 60}>
            <div className="group flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-500/15 dark:text-primary-300">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold">{title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// -------------------------------------------------------------- exams column

export function PopularExams() {
  return (
    <div className="card-base h-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-extrabold">Popular Exams</h3>
        <Link href="/exams" className="text-xs font-bold text-primary-600 hover:underline">
          View All
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-1.5">
        {POPULAR_EXAMS.map((exam) => (
          <li key={exam}>
            <Link
              href={`/courses?q=${encodeURIComponent(exam)}`}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium transition-all hover:translate-x-0.5 hover:bg-muted hover:text-primary-600"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-50 text-[9px] font-bold text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                {exam.slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate">{exam}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------- stories / why / download

const whyPoints = [
  '1000+ Top Universities',
  '1,00,000+ Courses & Programs',
  'AI Powered Guidance',
  'Personalized Roadmap',
  'Scholarships & EMI Available',
  'Trusted by 10 Lakh+ Students',
]

export function StoriesAndApp({
  testimonials,
}: {
  testimonials: { body: string; name: string; course: string }[]
}) {
  return (
    <section className="container grid gap-5 py-8 lg:grid-cols-3">
      {/* ------------------------------------------------------ testimonial */}
      <Reveal>
        <TiltCard className="group h-full" intensity={7}>
          <div className="card-base holo-surface relative flex h-full flex-col overflow-hidden p-5">
            <h3 className="text-base font-extrabold">Success Stories</h3>
            <Quote className="absolute right-4 top-4 h-10 w-10 text-primary-100 dark:text-primary-500/20" />

            {testimonials.slice(0, 1).map((t) => (
              <div key={t.name} className="relative mt-4 flex flex-1 flex-col">
                <p className="text-pretty text-[13px] leading-relaxed text-muted-foreground">
                  &ldquo;{t.body}&rdquo;
                </p>
                <div className="mt-auto flex items-center gap-2.5 pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-fade text-[11px] font-bold text-white">
                    {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold">— {t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.course}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TiltCard>
      </Reveal>

      {/* -------------------------------------------------------- why choose */}
      <Reveal delay={90}>
        <div className="card-base relative h-full overflow-hidden p-5">
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-holo-sweep opacity-15 blur-2xl"
          />
          <h3 className="relative text-base font-extrabold">Why Choose Shiksha Sarthi?</h3>
          <ul className="relative mt-4 space-y-2.5">
            {whyPoints.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[13px] font-medium">
                <span className="mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* ------------------------------------------------------ app download */}
      <Reveal delay={180}>
        <div className="card-base relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-primary-50 to-holo-cyan/10 p-5 dark:from-primary-500/10 dark:to-holo-violet/10">
          <h3 className="text-base font-extrabold">Download Our App</h3>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Learn on the go. Anytime, Anywhere.
          </p>

          <div className="mt-4 flex flex-1 items-end gap-4">
            <div className="space-y-2">
              <StoreButton store="Google Play" tagline="GET IT ON" />
              <StoreButton store="App Store" tagline="Download on the" />
            </div>

            {/* Stylised phone — the PWA is the real "app". */}
            <div className="relative ml-auto hidden h-32 w-16 shrink-0 rotate-6 rounded-2xl border-4 border-slate-800 bg-gradient-to-b from-primary-500 to-primary-700 shadow-lift transition-transform duration-500 hover:rotate-0 sm:block">
              <span className="absolute left-1/2 top-1 h-1 w-6 -translate-x-1/2 rounded-full bg-slate-800" />
              <Smartphone className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white/80" />
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-dashed border-border bg-surface/60 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            <strong className="font-bold text-foreground">Tip:</strong> this site is an installable
            app — open the browser menu and choose <em>Add to Home Screen</em>.
          </p>
        </div>
      </Reveal>
    </section>
  )
}

function StoreButton({ store, tagline }: { store: string; tagline: string }) {
  return (
    <span className="flex w-[136px] items-center gap-2 rounded-xl bg-slate-900 px-2.5 py-1.5 text-white transition-transform duration-300 hover:scale-105">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-white/15 text-[10px] font-bold">
        {store === 'App Store' ? '' : '▶'}
      </span>
      <span className="min-w-0 leading-none">
        <span className="block text-[7px] uppercase tracking-wide text-white/70">{tagline}</span>
        <span className="block truncate text-[11px] font-bold">{store}</span>
      </span>
    </span>
  )
}

// ------------------------------------------------------------ blog + closer

const posts = [
  { title: 'How to Complete Your Degree After Dropout?', date: 'May 20, 2026', tone: 'from-primary-500 to-holo-indigo' },
  { title: 'Best Online Degrees for Working Professionals', date: 'May 18, 2026', tone: 'from-emerald-500 to-teal-500' },
  { title: 'Top Government Exams after Graduation', date: 'May 15, 2026', tone: 'from-orange-500 to-rose-500' },
]

export function BlogAndCta() {
  return (
    <section className="container grid gap-5 py-8 lg:grid-cols-[1.5fr_1fr]">
      <Reveal>
        <div className="card-base h-full p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-extrabold">Latest from Our Blog</h3>
            <Link href="/blog" className="text-xs font-bold text-primary-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.title} href="/blog" className="group">
                <div
                  className={`relative mb-2.5 h-20 overflow-hidden rounded-xl bg-gradient-to-br ${p.tone}`}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.4)_0,rgba(255,255,255,.4)_1px,transparent_1px,transparent_12px)]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                </div>
                <p className="line-clamp-2 text-[13px] font-bold leading-snug transition-colors group-hover:text-primary-600">
                  {p.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {p.date}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="holo-ring relative flex h-full flex-col justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-violet-50 via-primary-50 to-white p-6 shadow-card dark:from-violet-500/10 dark:via-primary-500/10 dark:to-transparent">
          <div
            aria-hidden
            className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-holo-sweep opacity-20 blur-2xl"
          />
          <span className="relative mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-brand-fade shadow-glow">
            <HelpCircle className="h-5.5 w-5.5 text-white" />
          </span>
          <h3 className="relative font-display text-lg font-extrabold">
            Still Confused? We are here to help!
          </h3>
          <p className="relative mt-1.5 text-[13px] text-muted-foreground">
            Book a free counselling session with our experts and get a personalised roadmap.
          </p>
          <Link
            href="/counsellor"
            className={buttonVariants({ variant: 'holo', className: 'relative mt-5 self-start' })}
          >
            Book Free Session
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
