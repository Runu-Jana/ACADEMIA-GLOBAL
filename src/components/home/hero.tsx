import Link from 'next/link'
import {
  BookOpen, RefreshCw, GraduationCap, Trophy, ShieldCheck,
  Building2, Users, Sparkles, ArrowRight, Bot,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { CountUp } from '@/components/fx/count-up'
import { TiltCard } from '@/components/fx/tilt-card'
import { Reveal } from '@/components/fx/reveal'
import { HeroSceneMount } from './hero-scene-mount'

const journeyCards = [
  { icon: BookOpen, title: 'Learn', sub: 'Choose your path', tone: 'from-emerald-400 to-teal-500', delay: '0s' },
  { icon: RefreshCw, title: 'Restart', sub: 'Get the right guidance', tone: 'from-sky-400 to-blue-500', delay: '-1.5s' },
  { icon: GraduationCap, title: 'Continue', sub: 'Enroll & Study', tone: 'from-amber-400 to-orange-500', delay: '-3s' },
  { icon: Trophy, title: 'Succeed', sub: 'Achieve your goals', tone: 'from-fuchsia-400 to-violet-500', delay: '-4.5s' },
]

const stats = [
  { icon: Building2, to: 1000, suffix: '+', label: 'Universities' },
  { icon: BookOpen, to: 100000, suffix: '+', label: 'Courses' },
  { icon: Users, to: 10, suffix: ' Lakh+', label: 'Students' },
  { icon: ShieldCheck, to: 100, suffix: '%', label: 'Trusted Platform' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/*
        Section wash. The globe lives in the right column, and on a near-white
        page it was floating in blank space — worst in the top-right. Two soft
        radials anchored on the globe fill that void with brand colour, and a
        gentle top fade stops the header edge reading as a hard white band.
        A smooth gradient reads as a deliberate backdrop; blurred circles (the
        old approach) read as haze — that's the whole difference.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_65%_at_78%_28%,rgba(59,118,246,0.16),transparent_60%),radial-gradient(45%_50%_at_92%_78%,rgba(129,140,248,0.13),transparent_62%),linear-gradient(180deg,rgba(219,232,254,0.55),transparent_38%)] dark:[background:radial-gradient(60%_65%_at_78%_28%,rgba(59,118,246,0.14),transparent_62%),radial-gradient(50%_55%_at_90%_80%,rgba(99,102,241,0.12),transparent_64%)]"
      />
      <Aurora palette="brand" density={4} />
      <GridPattern />

      <div className="container relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-20">
        {/* ------------------------------------------------------------ copy */}
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50/80 px-3.5 py-1.5 text-[12px] font-bold text-primary-700 backdrop-blur-sm dark:border-primary-500/25 dark:bg-primary-500/10 dark:text-primary-200">
              <Sparkles className="h-3.5 w-3.5" />
              India&apos;s most trusted virtual learning platform
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 text-balance font-display text-[2.6rem] font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
              Continue Your
              <br />
              <span className="holo-text">Education Journey</span>
            </h1>
          </Reveal>

          <Reveal delay={150}>
            <p className="mt-4 text-lg font-bold text-primary-600 dark:text-primary-300 sm:text-xl">
              Left School or College? It&apos;s Never Too Late!
            </p>
            <p className="mt-3 max-w-lg text-pretty text-[15px] leading-relaxed text-muted-foreground">
              We help you restart, continue and complete your education from 10th to PG and beyond —
              with UGC-entitled degrees, live classes and placement support.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/courses" className={buttonVariants({ variant: 'holo', size: 'lg' })}>
                Start My Journey
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/counsellor" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                <Bot className="h-4 w-4 text-primary-600" />
                Ask Saarthi
              </Link>
            </div>
          </Reveal>

          <Reveal delay={300}>
            <dl className="mt-10 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              {stats.map(({ icon: Icon, to, suffix, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <dd className="text-[17px] font-extrabold leading-tight">
                      {/* en-IN grouping renders 100000 as "1,00,000". */}
                      <CountUp to={to} suffix={suffix} />
                    </dd>
                    <dt className="truncate text-[11px] font-medium text-muted-foreground">{label}</dt>
                  </div>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* --------------------------------------------------------- 3D scene */}
        <Reveal delay={180} className="relative">
          <div className="relative mx-auto aspect-square w-full max-w-[480px]">
            {/* Soft glow anchoring the scene. */}
            <div
              aria-hidden
              // Tight halo that anchors the globe to the section wash behind
              // it, rather than the wide faint blob that used to leak light.
              className="absolute left-1/2 top-1/2 h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-holo-sweep opacity-[.12] blur-2xl dark:opacity-25"
            />

            {/* WebGL globe — desktop only, lazy-loaded. Cards layer on top. */}
            <HeroSceneMount className="absolute inset-0 z-0" />

            {/* Centre badge. */}
            <TiltCard className="absolute left-1/2 top-1/2 z-10 w-[38%] -translate-x-1/2 -translate-y-1/2" intensity={16} scale={1.05}>
              <div className="holo-ring holo-surface grid aspect-square place-items-center rounded-3xl border border-white/50 bg-white/80 p-5 text-center shadow-lift backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                <div className="tilt-layer">
                  <span className="mx-auto mb-2.5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-fade shadow-glow">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </span>
                  <p className="font-display text-[15px] font-extrabold leading-tight">
                    Your Degree
                    <br />
                    Awaits
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">
                    UGC Entitled
                  </p>
                </div>
              </div>
            </TiltCard>

            {/* Four orbiting step cards. */}
            {journeyCards.map((c, i) => {
              // Kept clear of the centre badge (38% wide, vertically centred)
              // so no card overlaps it.
              const positions = [
                'left-0 top-[7%]',
                'right-0 top-[15%]',
                'left-0 bottom-[16%]',
                'right-0 bottom-[7%]',
              ]
              return (
                <div
                  key={c.title}
                  className={`absolute ${positions[i]} z-10 w-[44%] animate-float`}
                  style={{ animationDelay: c.delay }}
                >
                  <TiltCard intensity={14} scale={1.06}>
                    <div className="glass flex items-center gap-2.5 rounded-2xl border-primary-200/70 p-3 shadow-card dark:border-white/20">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${c.tone} shadow-sm`}
                      >
                        <c.icon className="h-4.5 w-4.5 text-white" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-extrabold leading-tight">{c.title}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{c.sub}</span>
                      </span>
                    </div>
                  </TiltCard>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
