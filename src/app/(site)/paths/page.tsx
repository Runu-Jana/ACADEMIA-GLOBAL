import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ChevronRight, Layers, ArrowRight, Route, GraduationCap } from 'lucide-react'
import { getLearningPaths } from '@/lib/paths'
import { Reveal } from '@/components/fx/reveal'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { Badge } from '@/components/ui/badge'
import { JsonLd } from '@/components/seo/json-ld'
import { breadcrumbLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('paths.meta')
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/paths' },
    openGraph: {
      title: t('title'),
      description: t('ogDescription'),
      url: '/paths',
      type: 'website',
    },
  }
}

export default async function PathsPage() {
  const [paths, t, tc] = await Promise.all([
    getLearningPaths(),
    getTranslations('paths'),
    getTranslations('courses'),
  ])

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Learning Paths', path: '/paths' },
        ])}
      />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-border bg-slate-950">
        <Aurora palette="holo" density={2} />
        <GridPattern />
        <div className="container relative py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Badge tone="holo" className="mb-4">
              <Route aria-hidden className="h-3 w-3" />
              {t('badge')}
            </Badge>
            <h1 className="text-balance font-display text-3xl font-extrabold text-white sm:text-4xl">
              {t.rich('hero.title', { accent: (chunks) => <span className="holo-text">{chunks}</span> })}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-[15px] text-white/70">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- listing */}
      <section className="container py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Link href="/" className="hover:text-primary-600">{t('home')}</Link>
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">{t('badge')}</span>
        </nav>

        {paths.length === 0 ? (
          <div className="card-base grid place-items-center px-6 py-16 text-center">
            <Layers aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-[15px] font-bold">{t('empty.title')}</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{t('empty.body')}</p>
            <Link href="/courses" className="mt-5 text-[13px] font-bold text-primary-600 hover:underline">
              {t('empty.cta')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paths.map((p, i) => (
              <Reveal key={p.slug} delay={Math.min(i, 6) * 50}>
                <Link
                  href={`/paths/${p.slug}`}
                  className="group card-base holo-ring holo-ring-hover flex h-full flex-col p-5 transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="primary">{tc(`stream.${p.stream}`)}</Badge>
                    {p.featured && <Badge tone="holo">{t('popular')}</Badge>}
                  </div>

                  <h2 className="mt-3 text-balance font-display text-lg font-extrabold leading-snug tracking-tight transition-colors group-hover:text-primary-600">
                    {p.title}
                  </h2>
                  <p className="mt-1.5 text-pretty text-[13px] text-muted-foreground">{p.subtitle}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers aria-hidden className="h-3.5 w-3.5" />
                      {t('courseCount', { count: p.courseCount })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap aria-hidden className="h-3.5 w-3.5" />
                      {p.levels.map((v) => tc(`level.${v}`)).join(' → ')}
                    </span>
                  </div>

                  <p className="mt-3 rounded-lg bg-muted/50 p-2.5 text-[12.5px] leading-relaxed text-foreground/80">
                    <span className="font-bold text-foreground">{t('outcomeLabel')}</span>
                    {p.outcome}
                  </p>

                  {p.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-bold text-primary-600 transition-all group-hover:gap-2.5">
                    {t('explore')}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
