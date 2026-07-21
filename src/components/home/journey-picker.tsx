'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, BookMarked, BookOpen, School, Briefcase,
  Bot, Map, Building2, Award, BadgeCheck, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Each entry point maps to a pre-filtered course search. */
const stages = [
  { key: 'before-10', label: 'Before\nClass 10', icon: GraduationCap, tone: 'emerald', query: '/courses?level=CERTIFICATE' },
  { key: 'after-10', label: 'After\nClass 10', icon: BookMarked, tone: 'blue', query: '/courses?level=DIPLOMA' },
  { key: 'after-12', label: 'After\nClass 12', icon: BookOpen, tone: 'orange', query: '/courses?level=UG' },
  { key: 'ug-incomplete', label: 'UG\nIncomplete', icon: School, tone: 'violet', query: '/courses?level=UG&mode=DISTANCE' },
  { key: 'pg-incomplete', label: 'PG\nIncomplete', icon: GraduationCap, tone: 'pink', query: '/courses?level=PG&mode=DISTANCE' },
  { key: 'working', label: 'Working\nProfessional', icon: Briefcase, tone: 'cyan', query: '/courses?mode=PART_TIME' },
] as const

const toneMap: Record<string, { active: string; idle: string; icon: string }> = {
  emerald: { active: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10', idle: 'hover:border-emerald-300', icon: 'text-emerald-600' },
  blue: { active: 'border-blue-400 bg-blue-50 dark:bg-blue-500/10', idle: 'hover:border-blue-300', icon: 'text-blue-600' },
  orange: { active: 'border-orange-400 bg-orange-50 dark:bg-orange-500/10', idle: 'hover:border-orange-300', icon: 'text-orange-600' },
  violet: { active: 'border-violet-400 bg-violet-50 dark:bg-violet-500/10', idle: 'hover:border-violet-300', icon: 'text-violet-600' },
  pink: { active: 'border-pink-400 bg-pink-50 dark:bg-pink-500/10', idle: 'hover:border-pink-300', icon: 'text-pink-600' },
  cyan: { active: 'border-cyan-400 bg-cyan-50 dark:bg-cyan-500/10', idle: 'hover:border-cyan-300', icon: 'text-cyan-600' },
}

const support = [
  { icon: Bot, label: 'AI Based Career Guidance' },
  { icon: Map, label: 'Personalized Study Roadmap' },
  { icon: Building2, label: 'Top Universities & Courses' },
  { icon: Award, label: 'Scholarships & EMI Options' },
  { icon: BadgeCheck, label: '100% Admission Assistance' },
]

export function JourneyPicker() {
  const router = useRouter()
  const [selected, setSelected] = React.useState<string | null>(null)

  const chosen = stages.find((s) => s.key === selected)

  return (
    <section className="container -mt-2 pb-4">
      <div className="holo-ring grid overflow-hidden rounded-3xl border border-border bg-card shadow-card lg:grid-cols-[1.55fr_1fr]">
        {/* ------------------------------------------------------- selector */}
        <div className="p-6 sm:p-7">
          <h2 className="text-xl font-extrabold">Where did you stop?</h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Select your last education level and we will show you the best options to continue.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {stages.map((s) => {
              const active = selected === s.key
              const tone = toneMap[s.tone]
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelected(active ? null : s.key)}
                  aria-pressed={active}
                  className={cn(
                    'group flex flex-col items-center gap-2 rounded-2xl border-2 bg-surface px-2 py-3.5 transition-all duration-300 ease-spring',
                    'hover:-translate-y-1 hover:shadow-card',
                    active ? cn(tone.active, 'shadow-card') : cn('border-border', tone.idle),
                  )}
                >
                  <s.icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-300 group-hover:scale-110',
                      tone.icon,
                    )}
                  />
                  <span className="whitespace-pre-line text-center text-[11px] font-bold leading-tight">
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => router.push(chosen?.query ?? '/courses')}
              disabled={!chosen}
              variant={chosen ? 'holo' : 'primary'}
            >
              Find My Best Path
              <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {chosen ? 'We found matching programs for you' : 'Takes less than 60 seconds'}
            </span>
          </div>
        </div>

        {/* -------------------------------------------------------- support */}
        <div className="relative overflow-hidden border-t border-border bg-gradient-to-br from-primary-50 to-holo-cyan/10 p-6 dark:from-primary-500/10 dark:to-holo-violet/10 sm:p-7 lg:border-l lg:border-t-0">
          <div
            aria-hidden
            className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-holo-sweep opacity-20 blur-2xl"
          />
          <h3 className="relative text-lg font-extrabold">Your Journey, Our Support</h3>
          <ul className="relative mt-4 space-y-3">
            {support.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-[13px] font-semibold">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-primary-600 shadow-sm dark:bg-slate-800 dark:text-primary-300">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
