import { prisma } from '@/lib/prisma'

/**
 * The engagement layer: learning streaks, a weekly goal, and achievement badges.
 *
 * Everything here is DERIVED from activity the student already generates —
 * `LessonProgress.completedAt` (one immutable row per lesson) and
 * `TestAttempt.submittedAt`. No parallel "activity log" to keep in sync, and no
 * backfill: a streak is simply the run of consecutive days on which the student
 * did something. The only stored state is the weekly target (LearningGoal).
 *
 * Days are bucketed in IST, since this is an India-facing platform and a learner
 * in Delhi should see their day roll over at local midnight, not UTC's.
 */

const IST_TZ = 'Asia/Kolkata'
export const DEFAULT_WEEKLY_TARGET = 5
export const MIN_WEEKLY_TARGET = 1
export const MAX_WEEKLY_TARGET = 7
/** Streak lengths worth celebrating with a notification. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365]

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** A date → its IST calendar day as `YYYY-MM-DD`. */
export function dayKeyIST(d: Date): string {
  return dayFmt.format(d)
}

export function todayKeyIST(): string {
  return dayKeyIST(new Date())
}

/** The UTC instant of IST midnight beginning `key` (IST is a fixed +05:30, no DST). */
function istDayStartUtc(key: string): Date {
  return new Date(`${key}T00:00:00+05:30`)
}

/** Steps a `YYYY-MM-DD` key by whole days. Keys are plain calendar dates, so
 *  treating them as UTC for the arithmetic is exact. */
function addDaysKey(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Monday (IST) of the week containing `key`. */
function weekStartKey(key: string): string {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
  const backToMon = (dow + 6) % 7
  return addDaysKey(key, -backToMon)
}

export type Streak = {
  /** Consecutive active days ending today, or ending yesterday if today is idle. */
  current: number
  longest: number
  /** Whether the student has already been active today. */
  activeToday: boolean
  /** Alive but not yet extended today — the "act now to keep it" state. */
  atRisk: boolean
}

/** Computes the current and longest streak from the set of active IST day keys. */
export function computeStreak(active: Set<string>, todayKey: string): Streak {
  const activeToday = active.has(todayKey)
  const yesterday = addDaysKey(todayKey, -1)

  // Count back from today (if active) or yesterday (streak still alive).
  const anchor = activeToday ? todayKey : active.has(yesterday) ? yesterday : null
  let current = 0
  if (anchor) {
    let k: string = anchor
    while (active.has(k)) {
      current += 1
      k = addDaysKey(k, -1)
    }
  }

  // Longest run anywhere in history.
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const k of [...active].sort()) {
    run = prev && addDaysKey(prev, 1) === k ? run + 1 : 1
    if (run > longest) longest = run
    prev = k
  }

  return { current, longest, activeToday, atRisk: current > 0 && !activeToday }
}

export type WeeklyGoal = {
  target: number
  activeDays: number
  met: boolean
  /** Days still needed this week to hit the target (0 once met). */
  remaining: number
  /** 0–100, for the ring. */
  percent: number
}

function weeklyGoal(active: Set<string>, todayKey: string, target: number): WeeklyGoal {
  const start = weekStartKey(todayKey)
  let activeDays = 0
  for (let i = 0; i < 7; i++) {
    const k = addDaysKey(start, i)
    if (k > todayKey) break // don't count future days of the current week
    if (active.has(k)) activeDays += 1
  }
  const met = activeDays >= target
  return {
    target,
    activeDays,
    met,
    remaining: Math.max(0, target - activeDays),
    percent: target > 0 ? Math.min(100, Math.round((activeDays / target) * 100)) : 0,
  }
}

/** One cell of the activity heatmap. */
export type HeatCell = { key: string; active: boolean; future: boolean }

/** `weeks` columns (oldest→newest), each 7 cells Mon→Sun, for a GitHub-style grid. */
function buildHeatmap(active: Set<string>, todayKey: string, weeks: number): HeatCell[][] {
  const firstMonday = addDaysKey(weekStartKey(todayKey), -7 * (weeks - 1))
  const cols: HeatCell[][] = []
  for (let c = 0; c < weeks; c++) {
    const col: HeatCell[] = []
    for (let r = 0; r < 7; r++) {
      const key = addDaysKey(firstMonday, c * 7 + r)
      col.push({ key, active: active.has(key), future: key > todayKey })
    }
    cols.push(col)
  }
  return cols
}

export type EngagementStats = {
  lessonsCompleted: number
  testsPassed: number
  coursesEnrolled: number
  coursesCompleted: number
  certificates: number
  currentStreak: number
  longestStreak: number
  weeklyActiveDays: number
}

export type BadgeDef = {
  id: string
  name: string
  description: string
  /** Icon key, mapped to a lucide component where badges render. */
  icon: string
  metric: keyof EngagementStats
  threshold: number
}

/** Achievement catalogue. Every badge is monotonic — earned once, earned for good. */
export const BADGES: BadgeDef[] = [
  { id: 'first-step', name: 'First Step', description: 'Complete your first lesson', icon: 'Footprints', metric: 'lessonsCompleted', threshold: 1 },
  { id: 'enrolled', name: 'Enrolled', description: 'Join your first course', icon: 'GraduationCap', metric: 'coursesEnrolled', threshold: 1 },
  { id: 'lessons-10', name: 'Getting Serious', description: 'Complete 10 lessons', icon: 'BookOpen', metric: 'lessonsCompleted', threshold: 10 },
  { id: 'assessed', name: 'Assessed', description: 'Pass your first test', icon: 'ClipboardCheck', metric: 'testsPassed', threshold: 1 },
  { id: 'streak-3', name: 'On a Roll', description: 'Reach a 3-day streak', icon: 'Flame', metric: 'longestStreak', threshold: 3 },
  { id: 'streak-7', name: 'Week Warrior', description: 'Reach a 7-day streak', icon: 'CalendarCheck', metric: 'longestStreak', threshold: 7 },
  { id: 'lessons-50', name: 'Scholar', description: 'Complete 50 lessons', icon: 'BookOpenCheck', metric: 'lessonsCompleted', threshold: 50 },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Pass 5 tests', icon: 'Target', metric: 'testsPassed', threshold: 5 },
  { id: 'finisher', name: 'Finisher', description: 'Complete a whole course', icon: 'Flag', metric: 'coursesCompleted', threshold: 1 },
  { id: 'certified', name: 'Certified', description: 'Earn your first certificate', icon: 'Award', metric: 'certificates', threshold: 1 },
  { id: 'streak-30', name: 'Unstoppable', description: 'Reach a 30-day streak', icon: 'Zap', metric: 'longestStreak', threshold: 30 },
]

export type EvaluatedBadge = {
  def: BadgeDef
  earned: boolean
  value: number
  percent: number
}

export function evaluateBadges(stats: EngagementStats): EvaluatedBadge[] {
  return BADGES.map((def) => {
    const value = stats[def.metric]
    return {
      def,
      earned: value >= def.threshold,
      value,
      percent: Math.min(100, Math.round((value / def.threshold) * 100)),
    }
  })
}

export type Engagement = {
  streak: Streak
  goal: WeeklyGoal
  stats: EngagementStats
  badges: EvaluatedBadge[]
  earnedCount: number
  heatmap: HeatCell[][]
}

/** Gathers a student's activity and derives the full engagement picture. */
export async function getEngagement(userId: string, heatmapWeeks = 12): Promise<Engagement> {
  const [lessons, attempts, enrollments, certificates, goalRow] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { userId }, select: { completedAt: true } }),
    prisma.testAttempt.findMany({ where: { userId }, select: { submittedAt: true, passed: true, testId: true } }),
    prisma.enrollment.findMany({ where: { userId }, select: { status: true } }),
    prisma.certificate.count({ where: { userId, revoked: false } }),
    prisma.learningGoal.findUnique({ where: { userId }, select: { weeklyDays: true } }),
  ])

  const active = new Set<string>()
  for (const l of lessons) active.add(dayKeyIST(l.completedAt))
  for (const a of attempts) active.add(dayKeyIST(a.submittedAt))

  const todayKey = todayKeyIST()
  const streak = computeStreak(active, todayKey)
  const target = goalRow?.weeklyDays ?? DEFAULT_WEEKLY_TARGET
  const goal = weeklyGoal(active, todayKey, target)

  const passedTests = new Set(attempts.filter((a) => a.passed).map((a) => a.testId))
  const stats: EngagementStats = {
    lessonsCompleted: lessons.length,
    testsPassed: passedTests.size,
    coursesEnrolled: enrollments.length,
    coursesCompleted: enrollments.filter((e) => e.status === 'COMPLETED').length,
    certificates,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    weeklyActiveDays: goal.activeDays,
  }

  const badges = evaluateBadges(stats)
  return {
    streak,
    goal,
    stats,
    badges,
    earnedCount: badges.filter((b) => b.earned).length,
    heatmap: buildHeatmap(active, todayKey, heatmapWeeks),
  }
}

/** Whether the student has any activity recorded today (IST) — cheap count. */
export async function hadActivityToday(userId: string): Promise<boolean> {
  const start = istDayStartUtc(todayKeyIST())
  const [lp, ta] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId, completedAt: { gte: start } } }),
    prisma.testAttempt.count({ where: { userId, submittedAt: { gte: start } } }),
  ])
  return lp + ta > 0
}

export type StreakSnapshot = {
  current: number
  weeklyActiveDays: number
  weeklyTarget: number
  weeklyGoalMet: boolean
}

/**
 * A lean streak + weekly-goal read for the lesson-completion celebration hook.
 * Deliberately lighter than getEngagement (no badges/enrolments/certs).
 */
export async function getStreakSnapshot(userId: string): Promise<StreakSnapshot> {
  const [lessons, attempts, goalRow] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { userId }, select: { completedAt: true } }),
    prisma.testAttempt.findMany({ where: { userId }, select: { submittedAt: true } }),
    prisma.learningGoal.findUnique({ where: { userId }, select: { weeklyDays: true } }),
  ])
  const active = new Set<string>()
  for (const l of lessons) active.add(dayKeyIST(l.completedAt))
  for (const a of attempts) active.add(dayKeyIST(a.submittedAt))

  const todayKey = todayKeyIST()
  const target = goalRow?.weeklyDays ?? DEFAULT_WEEKLY_TARGET
  const goal = weeklyGoal(active, todayKey, target)
  return {
    current: computeStreak(active, todayKey).current,
    weeklyActiveDays: goal.activeDays,
    weeklyTarget: goal.target,
    weeklyGoalMet: goal.met,
  }
}
