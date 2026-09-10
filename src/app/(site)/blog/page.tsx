import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CalendarDays, Clock, ArrowRight } from 'lucide-react'
import { SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Aurora } from '@/components/fx/aurora'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Guides on completing your degree, choosing between online and distance learning, and building a career after a study gap.',
}

// Presentation only — title, excerpt and date come from `blog.posts.<key>`; the
// tag maps through `blog.tag.<value>`.
const posts = [
  { key: 'dropout', read: 7, tag: 'Guides', tone: 'from-primary-500 to-holo-indigo' },
  { key: 'working', read: 6, tag: 'Careers', tone: 'from-emerald-500 to-teal-500' },
  { key: 'govtExams', read: 8, tag: 'Exams', tone: 'from-orange-500 to-rose-500' },
  { key: 'onlineVsDistance', read: 5, tag: 'Explainers', tone: 'from-violet-500 to-fuchsia-500' },
  { key: 'validity', read: 6, tag: 'Explainers', tone: 'from-cyan-500 to-blue-500' },
  { key: 'funding', read: 7, tag: 'Money', tone: 'from-amber-500 to-orange-500' },
] as const

export default async function BlogPage() {
  const t = await getTranslations('blog')

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora palette="holo" density={2} />
        <div className="container relative py-14 text-center">
          <Badge tone="holo" className="mb-4">{t('badge')}</Badge>
          <h1 className="text-balance font-display text-3xl font-extrabold sm:text-4xl">
            {t.rich('title', { accent: (chunks) => <span className="holo-text">{chunks}</span> })}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[15px] text-muted-foreground">
            {t('sub')}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <SectionTitle eyebrow={t('eyebrow')} title={t('sectionTitle')} />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.key} delay={i * 60}>
              <TiltCard className="group h-full" intensity={7}>
                <article className="card-base holo-ring holo-ring-hover flex h-full flex-col overflow-hidden hover:shadow-lift">
                  <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${p.tone}`}>
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.4)_0,rgba(255,255,255,.4)_1px,transparent_1px,transparent_14px)]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <Badge tone="default" className="absolute left-3 top-3 border-transparent bg-white/90 text-slate-800">
                      {t(`tag.${p.tag}`)}
                    </Badge>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="line-clamp-2 text-[15px] font-extrabold leading-snug transition-colors group-hover:text-primary-600">
                      {t(`posts.${p.key}.title`)}
                    </h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {t(`posts.${p.key}.excerpt`)}
                    </p>

                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {t(`posts.${p.key}.date`)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t('minRead', { n: String(p.read) })}
                      </span>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <p className="mt-10 text-center text-[13px] text-muted-foreground">
          {t('footerNote')}{' '}
          <Link href="/counsellor" className="font-bold text-primary-600 hover:underline">
            {t('askCounsellor')}
          </Link>
        </p>
      </section>
    </>
  )
}
