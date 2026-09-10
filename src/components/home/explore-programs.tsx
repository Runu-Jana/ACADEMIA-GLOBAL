import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Laptop, BookOpen, Building2, Clock, ArrowRight } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { TiltCard } from '@/components/fx/tilt-card'
import { Reveal } from '@/components/fx/reveal'

// Labels/copy live in messages (home.programs.<mkey>.*); icons/hrefs stay here.
const programs = [
  {
    icon: Laptop,
    mkey: 'online',
    accent: 'text-violet-600',
    ring: 'from-violet-500 to-fuchsia-500',
    links: [
      { key: 'ug', href: '/courses?mode=ONLINE&level=UG' },
      { key: 'pg', href: '/courses?mode=ONLINE&level=PG' },
      { key: 'diploma', href: '/courses?mode=ONLINE&level=DIPLOMA' },
      { key: 'certificate', href: '/courses?mode=ONLINE&level=CERTIFICATE' },
    ],
    ctaHref: '/courses?mode=ONLINE',
  },
  {
    icon: BookOpen,
    mkey: 'distance',
    accent: 'text-orange-600',
    ring: 'from-orange-500 to-amber-500',
    links: [
      { key: 'ug', href: '/courses?mode=DISTANCE&level=UG' },
      { key: 'pg', href: '/courses?mode=DISTANCE&level=PG' },
      { key: 'diploma', href: '/courses?mode=DISTANCE&level=DIPLOMA' },
      { key: 'certificate', href: '/courses?mode=DISTANCE&level=CERTIFICATE' },
    ],
    ctaHref: '/courses?mode=DISTANCE',
  },
  {
    icon: Building2,
    mkey: 'regular',
    accent: 'text-emerald-600',
    ring: 'from-emerald-500 to-teal-500',
    links: [
      { key: 'engineering', href: '/courses?mode=REGULAR&stream=ENGINEERING' },
      { key: 'medical', href: '/courses?mode=REGULAR&stream=MEDICAL' },
      { key: 'law', href: '/courses?mode=REGULAR&stream=LAW' },
      { key: 'management', href: '/courses?mode=REGULAR&stream=MANAGEMENT' },
    ],
    ctaHref: '/courses?mode=REGULAR',
  },
  {
    icon: Clock,
    mkey: 'partTime',
    accent: 'text-pink-600',
    ring: 'from-pink-500 to-rose-500',
    links: [
      { key: 'weekend', href: '/courses?mode=PART_TIME' },
      { key: 'evening', href: '/courses?mode=PART_TIME&level=CERTIFICATE' },
      { key: 'hybrid', href: '/courses?mode=HYBRID' },
      { key: 'shortTerm', href: '/courses?level=CERTIFICATE' },
    ],
    ctaHref: '/courses?mode=PART_TIME',
  },
] as const

export async function ExplorePrograms() {
  const t = await getTranslations('home.programs')
  return (
    <section className="container py-14">
      <SectionTitle center eyebrow={t('eyebrow')} title={t('title')} sub={t('sub')} />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {programs.map((p, i) => (
          <Reveal key={p.mkey} delay={i * 80}>
            <TiltCard className="group h-full" intensity={8}>
              <div className="card-base holo-ring holo-ring-hover flex h-full flex-col overflow-hidden p-5 hover:shadow-lift">
                <div className="flex items-start gap-3">
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted">
                    <span
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${p.ring} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                    />
                    <p.icon
                      className={`relative h-5 w-5 ${p.accent} transition-colors duration-500 group-hover:text-white`}
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className={`text-[15px] font-extrabold ${p.accent}`}>{t(`${p.mkey}.title`)}</h3>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t(`${p.mkey}.sub`)}</p>
                  </div>
                </div>

                <ul className="mt-4 flex-1 space-y-0.5 border-t border-border pt-3">
                  {p.links.map((l) => (
                    <li key={l.key}>
                      <Link
                        href={l.href}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] font-medium text-foreground/85 transition-all hover:bg-muted hover:text-primary-600"
                      >
                        {t(`${p.mkey}.${l.key}`)}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.ctaHref}
                  className={`mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold ${p.accent} transition-all hover:gap-2.5`}
                >
                  {t(`${p.mkey}.cta`)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
