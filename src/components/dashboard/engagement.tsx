import Link from 'next/link'
import {
  Flame, Trophy, Lock, ArrowRight, CalendarCheck, Zap, Target, Award, Flag,
  Footprints, GraduationCap, BookOpen, BookOpenCheck, ClipboardCheck,
} from 'lucide-react'
import { ProgressRing } from '@/components/ui/progress'
import { GoalSetter } from './goal-setter'
import { cn } from '@/lib/utils'
import type { Engagement, EvaluatedBadge, HeatCell, Streak, WeeklyGoal } from '@/lib/gamification'

/* Badge icon keys → components (kept beside the badges that use them). */
const BADGE_ICONS: Record<string, React.ElementType> = {
  Footprints, GraduationCap, BookOpen, BookOpenCheck, ClipboardCheck,
  Flame, CalendarCheck, Target, Flag, Award, Zap,
}

/* --------------------------------------------------------------- streak */

export function StreakCard({ streak }: { streak: Streak }) {
  const on = streak.current > 0
  const status = streak.activeToday
    ? "You've learned today — nice work."
    : streak.atRisk
      ? 'Study today to keep your streak alive.'
      : 'Complete a lesson to start a streak.'

  return (
    <div className="card-base relative flex flex-col overflow-hidden p-5">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl transition-opacity',
          on ? 'bg-orange-400/25' : 'bg-muted-foreground/10',
        )}
      />
      <div className="relative flex items-center gap-4">
        <span
          className={cn(
            'grid h-16 w-16 shrink-0 place-items-center rounded-2xl',
            on
              ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-glow'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Flame className={cn('h-8 w-8', on && 'fill-current')} />
        </span>
        <div>
          <p className="font-display text-4xl font-extrabold leading-none tabular-nums">{streak.current}</p>
          <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
            day{streak.current === 1 ? '' : 's'} streak
          </p>
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted-foreground">{status}</p>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          Best: {streak.longest}
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- weekly goal */

export function WeeklyGoalCard({ goal }: { goal: WeeklyGoal }) {
  return (
    <div className="card-base flex h-full flex-col p-5">
      <div className="flex items-center gap-4">
        <ProgressRing value={goal.percent} size={72} stroke={7}>
          <span className="text-[15px] font-extrabold tabular-nums">
            {goal.activeDays}/{goal.target}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold">Weekly goal</h3>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {goal.met ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Goal met this week 🎉</span>
            ) : (
              <>
                <span className="font-bold text-foreground">{goal.remaining}</span> more day
                {goal.remaining === 1 ? '' : 's'} to hit your goal
              </>
            )}
          </p>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <GoalSetter target={goal.target} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- heatmap */

const WEEKDAY_LABELS = ['M', '', 'W', '', 'F', '', 'S']

export function ActivityHeatmap({ heatmap }: { heatmap: HeatCell[][] }) {
  return (
    <div className="card-base p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">Activity</h3>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Less</span>
          <span className="h-3 w-3 rounded-[3px] bg-muted" />
          <span className="h-3 w-3 rounded-[3px] bg-primary-300 dark:bg-primary-500/50" />
          <span className="h-3 w-3 rounded-[3px] bg-primary-600" />
          <span>More</span>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="flex gap-[3px]">
          {/* Weekday labels down the left. */}
          <div className="mr-1 flex flex-col gap-[3px]">
            {WEEKDAY_LABELS.map((l, i) => (
              <span key={i} className="grid h-3 w-3 place-items-center text-[9px] font-bold text-muted-foreground/70">
                {l}
              </span>
            ))}
          </div>
          {heatmap.map((week, c) => (
            <div key={c} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <span
                  key={cell.key}
                  title={cell.future ? undefined : `${cell.key}${cell.active ? ' · active' : ''}`}
                  className={cn(
                    'h-3 w-3 rounded-[3px]',
                    cell.future
                      ? 'bg-transparent'
                      : cell.active
                        ? 'bg-primary-600'
                        : 'bg-muted',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Last 12 weeks · each square is a day (IST)</p>
    </div>
  )
}

/* -------------------------------------------------------------- badges */

export function BadgeGrid({ badges }: { badges: EvaluatedBadge[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {badges.map((b) => {
        const Icon = BADGE_ICONS[b.def.icon] ?? Trophy
        return (
          <div
            key={b.def.id}
            className={cn(
              'card-base relative flex flex-col items-center gap-2 p-4 text-center transition-shadow',
              b.earned ? 'hover:shadow-lift' : 'opacity-80',
            )}
          >
            <span
              className={cn(
                'grid h-12 w-12 place-items-center rounded-2xl',
                b.earned
                  ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-glow'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {b.earned ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
            </span>
            <div>
              <p className={cn('text-[13px] font-bold leading-tight', !b.earned && 'text-muted-foreground')}>
                {b.def.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{b.def.description}</p>
            </div>
            {!b.earned && b.def.threshold > 1 && b.value > 0 && (
              <div className="mt-auto w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${b.percent}%` }} />
                </div>
                <p className="mt-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {b.value}/{b.def.threshold}
                </p>
              </div>
            )}
            {b.earned && (
              <span className="absolute right-2 top-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                Earned
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------ compact home summary */

/** The momentum strip shown on the dashboard home, linking to the full page. */
export function EngagementSummary({ engagement }: { engagement: Engagement }) {
  const { streak, goal, earnedCount, badges } = engagement
  const on = streak.current > 0
  return (
    <Link
      href="/dashboard/goals"
      className="card-base holo-ring-hover group flex items-center gap-4 p-4 transition-shadow hover:shadow-lift sm:gap-6 sm:p-5"
    >
      {/* streak */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
            on ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-muted text-muted-foreground',
          )}
        >
          <Flame className={cn('h-5 w-5', on && 'fill-current')} />
        </span>
        <div>
          <p className="font-display text-xl font-extrabold leading-none tabular-nums">{streak.current}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">day streak</p>
        </div>
      </div>

      <span className="hidden h-10 w-px bg-border sm:block" />

      {/* weekly goal */}
      <div className="flex items-center gap-3">
        <ProgressRing value={goal.percent} size={44} stroke={5}>
          <span className="text-[11px] font-extrabold tabular-nums">{goal.activeDays}/{goal.target}</span>
        </ProgressRing>
        <div className="hidden sm:block">
          <p className="text-[13px] font-bold leading-none">This week</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {goal.met ? 'Goal met 🎉' : `${goal.remaining} day${goal.remaining === 1 ? '' : 's'} to go`}
          </p>
        </div>
      </div>

      <span className="hidden h-10 w-px bg-border md:block" />

      {/* badges */}
      <div className="hidden items-center gap-3 md:flex">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-xl font-extrabold leading-none tabular-nums">
            {earnedCount}
            <span className="text-sm font-bold text-muted-foreground">/{badges.length}</span>
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground">badges</p>
        </div>
      </div>

      <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-bold text-primary-600 transition-colors group-hover:text-primary-700 dark:text-primary-300">
        <span className="hidden sm:inline">View goals</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
