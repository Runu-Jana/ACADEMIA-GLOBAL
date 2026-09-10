import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { GraduationCap, BookMarked, BookOpen, School, Briefcase, Award, Bot, ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'

const paths = [
  { icon: GraduationCap, mkey: 'class10', href: '/courses?level=CERTIFICATE', tone: 'from-emerald-400 to-teal-500' },
  { icon: BookMarked, mkey: 'class12', href: '/courses?level=DIPLOMA', tone: 'from-sky-400 to-blue-500' },
  { icon: BookOpen, mkey: 'graduation', href: '/courses?level=UG', tone: 'from-amber-400 to-orange-500' },
  { icon: School, mkey: 'pg', href: '/courses?level=PG', tone: 'from-violet-400 to-purple-500' },
  { icon: Briefcase, mkey: 'professional', href: '/courses?mode=PART_TIME', tone: 'from-pink-400 to-rose-500' },
  { icon: Award, mkey: 'skill', href: '/courses?level=CERTIFICATE', tone: 'from-cyan-400 to-teal-500' },
] as const

export async function RestartPanel() {
  const [t, th] = await Promise.all([getTranslations('home.restart'), getTranslations('header')])
  return (
    <section className="container py-4">
      <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        {/* -------------------------------------------------- dark path panel */}
        <Reveal>
          <div className="relative h-full overflow-hidden rounded-3xl bg-primary-900 p-6 text-white shadow-lift sm:p-7">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl" />
              <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-holo-violet/25 blur-3xl" />
            </div>
            <div className="grain absolute inset-0" aria-hidden />

            <div className="relative">
              <h2 className="font-display text-xl font-extrabold sm:text-2xl">{t('title')}</h2>
              <p className="mt-1.5 text-sm text-white/70">{t('sub')}</p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {paths.map((p) => (
                  <Link
                    key={p.mkey}
                    href={p.href}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border border-white/12 bg-white/[.07] px-2 py-4 text-center backdrop-blur-sm transition-all duration-300 ease-spring hover:-translate-y-1.5 hover:border-white/30 hover:bg-white/[.13]"
                  >
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${p.tone} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
                    >
                      <p.icon className="h-5 w-5 text-white" />
                    </span>
                    <span className="whitespace-pre-line text-[11px] font-bold leading-tight">
                      {t(`paths.${p.mkey}`)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ------------------------------------------------------ counsellor */}
        <Reveal delay={120}>
          <TiltCard className="group h-full" intensity={9}>
            <div className="holo-ring relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-6 shadow-card dark:border-amber-500/20 dark:from-amber-500/10 dark:via-orange-500/5 dark:to-transparent">
              <div
                aria-hidden
                className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-holo-sweep opacity-25 blur-2xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-extrabold">Sarthi</h3>
                    <p className="mt-2 max-w-[15rem] text-[13px] leading-relaxed text-muted-foreground">
                      {t('counsellorSub')}
                    </p>
                  </div>

                  <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-holo-sweep shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <Bot className="h-7 w-7 text-white" />
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  </span>
                </div>
              </div>

              <Link
                href="/counsellor"
                className={buttonVariants({ variant: 'primary', className: 'relative mt-6 w-full' })}
              >
                {th('askSarthi')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  )
}
