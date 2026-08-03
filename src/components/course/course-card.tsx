'use client'

import Link from 'next/link'
import { Clock, Monitor, ShieldCheck, GitCompare, Check, Sparkles, Briefcase } from 'lucide-react'
import { CourseThumb, UniversityMark } from './course-thumb'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { buttonVariants } from '@/components/ui/button'
import { TiltCard } from '@/components/fx/tilt-card'
import { useCompare } from '@/lib/use-compare'
import { cn, formatINR } from '@/lib/utils'
import { COURSE_MODES } from '@/lib/constants'

export type CourseCardData = {
  id: string
  slug: string
  title: string
  mode: string
  stream: string
  level: string
  durationYears: number
  feePerYear: number
  originalFee: number | null
  discountPct: number
  rating: number
  reviews: number
  isUgcEntitled: boolean
  hasPlacement: boolean
  hasLiveClass: boolean
  university: { name: string; shortName: string; slug: string }
}

export function CourseCard({
  course,
  className,
  tilt = true,
}: {
  course: CourseCardData
  className?: string
  tilt?: boolean
}) {
  const { has, toggle } = useCompare()
  const inCompare = has(course.id)
  const modeLabel = COURSE_MODES.find((m) => m.value === course.mode)?.label ?? course.mode

  const features = [
    course.isUgcEntitled && { icon: ShieldCheck, label: 'UGC Entitled' },
    course.hasLiveClass && { icon: Sparkles, label: 'Live Classes' },
    course.hasPlacement && { icon: Briefcase, label: 'Placement' },
  ].filter(Boolean) as { icon: React.ElementType; label: string }[]

  const body = (
    <article
      className={cn(
        'group/card card-base holo-ring holo-ring-hover flex h-full flex-col overflow-hidden',
        'hover:shadow-lift',
        className,
      )}
    >
      <div className="relative">
        <CourseThumb stream={course.stream} title={course.title} className="h-36" />

        {course.isUgcEntitled && (
          <Badge tone="holo" className="absolute left-3 top-3 shadow-sm">
            <ShieldCheck className="h-3 w-3" />
            UGC Entitled
          </Badge>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            const r = toggle(course.id)
            if (r.full) alert('You can compare up to 4 courses at a time.')
          }}
          aria-pressed={inCompare}
          aria-label={inCompare ? 'Remove from comparison' : 'Add to comparison'}
          title={inCompare ? 'Remove from comparison' : 'Add to comparison'}
          className={cn(
            'absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg backdrop-blur-md transition-all duration-300 active:scale-90',
            inCompare
              ? 'bg-accent-orange text-white shadow-sm'
              : 'bg-white/85 text-slate-600 hover:bg-white hover:text-primary-600',
          )}
        >
          {inCompare ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
        </button>

      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/courses/${course.slug}`} className="group/title">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug transition-colors group-hover/title:text-primary-600">
            {course.title}
          </h3>
        </Link>

        <div className="mt-2.5 flex items-center gap-2">
          <UniversityMark name={course.university.name} size={22} />
          <Link
            href={`/universities/${course.university.slug}`}
            className="truncate text-xs font-semibold text-muted-foreground transition-colors hover:text-primary-600"
          >
            {course.university.name}
          </Link>
          <Stars rating={course.rating} size={12} className="ml-auto shrink-0" />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip">
            <Clock className="h-3 w-3" />
            {course.durationYears} {course.durationYears === 1 ? 'Year' : 'Years'}
          </span>
          <span className="chip">
            <Monitor className="h-3 w-3" />
            {modeLabel}
          </span>
        </div>

        <div className="mt-3.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-extrabold text-primary-700 dark:text-primary-300">
            {formatINR(course.feePerYear)}
          </span>
          <span className="text-[11px] text-muted-foreground">/ year</span>
          {course.originalFee && (
            <span className="text-xs text-muted-foreground line-through">
              {formatINR(course.originalFee)}
            </span>
          )}
          {course.discountPct > 0 && (
            <span className="rounded-md bg-accent-green px-1.5 py-0.5 text-[10.5px] font-bold leading-none text-white">
              {course.discountPct}% OFF
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-border pt-3">
          {features.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex flex-col items-center gap-1 text-center text-[10px] font-semibold leading-tight text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary-500" />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={`/courses/${course.slug}`}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'flex-1' })}
          >
            View Details
          </Link>
          <Link
            href={`/apply/${course.slug}`}
            className={buttonVariants({ variant: 'primary', size: 'sm', className: 'flex-1' })}
          >
            Apply Now
          </Link>
        </div>
      </div>
    </article>
  )

  return tilt ? (
    <TiltCard className="group h-full" intensity={7} scale={1.015}>
      {body}
    </TiltCard>
  ) : (
    body
  )
}
