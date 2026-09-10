'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { UniversityMark } from '@/components/course/course-thumb'
import { Stars } from '@/components/ui/stars'
import { TiltCard } from '@/components/fx/tilt-card'
import { asList, cn } from '@/lib/utils'

export type RailUniversity = {
  id: string
  slug: string
  name: string
  shortName: string
  rating: number
  approvals: unknown
}

export function UniversityRail({ universities }: { universities: RailUniversity[] }) {
  const t = useTranslations('home.universities')
  const scroller = React.useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = React.useState(true)
  const [atEnd, setAtEnd] = React.useState(false)

  const updateEdges = React.useCallback(() => {
    const el = scroller.current
    if (!el) return
    setAtStart(el.scrollLeft <= 4)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }, [])

  React.useEffect(() => {
    updateEdges()
    const el = scroller.current
    if (!el) return
    el.addEventListener('scroll', updateEdges, { passive: true })
    window.addEventListener('resize', updateEdges)
    return () => {
      el.removeEventListener('scroll', updateEdges)
      window.removeEventListener('resize', updateEdges)
    }
  }, [updateEdges])

  function scrollBy(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={atStart}
        aria-label={t('prev')}
        className={cn(
          'absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card shadow-card transition-all hover:border-primary-300 hover:text-primary-600 disabled:opacity-0 sm:grid',
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scroller}
        className="no-scrollbar mask-fade-x flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {universities.map((u) => (
          <div key={u.id} className="w-[calc(50%-8px)] shrink-0 snap-start sm:w-[210px]">
            <TiltCard className="group h-full" intensity={10}>
              <Link
                href={`/universities/${u.slug}`}
                className="card-base holo-ring holo-ring-hover flex h-full flex-col items-center gap-2 p-4 text-center hover:shadow-lift"
              >
                <UniversityMark
                  name={u.name}
                  size={44}
                  className="transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                />
                <p className="mt-1 line-clamp-2 text-[13px] font-extrabold leading-tight">{u.name}</p>
                <p className="line-clamp-1 text-[10px] font-medium text-muted-foreground">
                  {asList(u.approvals).slice(0, 2).join(' · ')}
                </p>
                <Stars rating={u.rating} size={11} className="mt-auto pt-1.5" />
              </Link>
            </TiltCard>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={atEnd}
        aria-label={t('next')}
        className={cn(
          'absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card shadow-card transition-all hover:border-primary-300 hover:text-primary-600 disabled:opacity-0 sm:grid',
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
