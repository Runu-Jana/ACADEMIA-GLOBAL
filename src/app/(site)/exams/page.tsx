import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CalendarDays, FileText, Target, ArrowRight } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'
import { EXAMS } from '@/lib/exams'

export const metadata: Metadata = {
  title: 'Entrance & Competitive Exams',
  description: 'Explore popular entrance and competitive exams in India with eligibility, pattern and preparation guidance.',
}

export default async function ExamsPage() {
  const t = await getTranslations('exams')

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="cool" density={3} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">{t('badge')}</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            {t.rich('title', { accent: (chunks) => <span className="holo-text">{chunks}</span> })}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-[15px] text-muted-foreground">
            {t('sub')}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle
          eyebrow={t('sectionEyebrow')}
          title={t('sectionTitle')}
          sub={t('sectionSub')}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMS.map((e, i) => (
            <Reveal key={e.name} delay={i * 50}>
              <TiltCard className="group h-full" intensity={7}>
                {/* scroll-mt clears the sticky header when arriving via the
                    /exams#exam-<slug> anchor a search result links to. */}
                <article id={`exam-${e.slug}`} className="card-base holo-ring holo-ring-hover flex h-full scroll-mt-24 flex-col p-5 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[15px] font-extrabold leading-snug">{e.name}</h2>
                    <Badge tone={e.tone}>{t(`items.${e.slug}.category`)}</Badge>
                  </div>

                  <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                    {t(`items.${e.slug}.blurb`)}
                  </p>

                  <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">{t('eligibility')}</dt>
                        <dd className="truncate font-bold">{t(`items.${e.slug}.level`)}</dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">{t('windowLabel')}</dt>
                        <dd className="truncate font-bold">{t(`items.${e.slug}.window`)}</dd>
                      </div>
                    </div>
                  </dl>

                  <Link
                    href={`/courses?q=${encodeURIComponent(e.category)}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600 transition-all hover:gap-2.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {t('relatedCourses')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-[13px] text-muted-foreground">
          {t('disclaimer')}
        </p>
      </section>
    </>
  )
}
