import Link from 'next/link'
import { Laptop, BookOpen, Building2, Clock, ArrowRight } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { TiltCard } from '@/components/fx/tilt-card'
import { Reveal } from '@/components/fx/reveal'

const programs = [
  {
    icon: Laptop,
    title: 'Online Degree',
    sub: 'Study Anytime, Anywhere',
    accent: 'text-violet-600',
    ring: 'from-violet-500 to-fuchsia-500',
    links: [
      { label: 'UG Online Degrees', href: '/courses?mode=ONLINE&level=UG' },
      { label: 'PG Online Degrees', href: '/courses?mode=ONLINE&level=PG' },
      { label: 'Diploma Online', href: '/courses?mode=ONLINE&level=DIPLOMA' },
      { label: 'Certificate Courses', href: '/courses?mode=ONLINE&level=CERTIFICATE' },
    ],
    cta: { label: 'Explore Online Degrees', href: '/courses?mode=ONLINE' },
  },
  {
    icon: BookOpen,
    title: 'Distance Learning',
    sub: 'UGC & DEB Approved Programs',
    accent: 'text-orange-600',
    ring: 'from-orange-500 to-amber-500',
    links: [
      { label: 'UG Distance Degrees', href: '/courses?mode=DISTANCE&level=UG' },
      { label: 'PG Distance Degrees', href: '/courses?mode=DISTANCE&level=PG' },
      { label: 'Diploma Courses', href: '/courses?mode=DISTANCE&level=DIPLOMA' },
      { label: 'Certificate Courses', href: '/courses?mode=DISTANCE&level=CERTIFICATE' },
    ],
    cta: { label: 'Explore Distance Courses', href: '/courses?mode=DISTANCE' },
  },
  {
    icon: Building2,
    title: 'Regular Degree',
    sub: 'On-Campus Programs from Top Universities',
    accent: 'text-emerald-600',
    ring: 'from-emerald-500 to-teal-500',
    links: [
      { label: 'Engineering', href: '/courses?mode=REGULAR&stream=ENGINEERING' },
      { label: 'Medical', href: '/courses?mode=REGULAR&stream=MEDICAL' },
      { label: 'Law', href: '/courses?mode=REGULAR&stream=LAW' },
      { label: 'Management', href: '/courses?mode=REGULAR&stream=MANAGEMENT' },
    ],
    cta: { label: 'Explore Regular Degrees', href: '/courses?mode=REGULAR' },
  },
  {
    icon: Clock,
    title: 'Part-Time Courses',
    sub: 'For Working Professionals & Busy Learners',
    accent: 'text-pink-600',
    ring: 'from-pink-500 to-rose-500',
    links: [
      { label: 'Weekend Programs', href: '/courses?mode=PART_TIME' },
      { label: 'Evening Programs', href: '/courses?mode=PART_TIME&level=CERTIFICATE' },
      { label: 'Hybrid Programs', href: '/courses?mode=HYBRID' },
      { label: 'Short Term Courses', href: '/courses?level=CERTIFICATE' },
    ],
    cta: { label: 'Explore Part-Time Courses', href: '/courses?mode=PART_TIME' },
  },
]

export function ExplorePrograms() {
  return (
    <section className="container py-14">
      <SectionTitle
        center
        eyebrow="Programs"
        title="Explore Programs"
        sub="Every format of learning, from fully online degrees to on-campus programs — pick what fits your life."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {programs.map((p, i) => (
          <Reveal key={p.title} delay={i * 80}>
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
                    <h3 className={`text-[15px] font-extrabold ${p.accent}`}>{p.title}</h3>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.sub}</p>
                  </div>
                </div>

                <ul className="mt-4 flex-1 space-y-0.5 border-t border-border pt-3">
                  {p.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] font-medium text-foreground/85 transition-all hover:bg-muted hover:text-primary-600"
                      >
                        {l.label}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.cta.href}
                  className={`mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold ${p.accent} transition-all hover:gap-2.5`}
                >
                  {p.cta.label}
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
