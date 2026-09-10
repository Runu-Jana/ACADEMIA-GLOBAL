import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { reminderEmail } from '@/lib/emails'
import { notify } from '@/lib/notifications'
import { getStreakSnapshot, dayKeyIST } from '@/lib/gamification'
import { resolvePrefs, wants } from '@/lib/notification-prefs'
import { captureError } from '@/lib/observability'

/**
 * Re-engagement nudges — the out-of-app half of the notification story.
 *
 * Run daily by the cron. For each enrolled student it picks at most one nudge:
 *  - streak_save : learned yesterday, on a ≥3-day streak, hasn't learned today
 *                  → "keep your streak alive" (fires daily until they act or lapse)
 *  - continue    : lapsed 3–21 days with a course in progress → "pick up where you left off"
 *  - comeback    : lapsed 3–21 days having never started an enrolled course
 *
 * Each nudge is an in-app notification PLUS an email (best-effort; the email
 * no-ops when RESEND_API_KEY is unset). A NUDGE_COOLDOWN keeps the general nudges
 * to roughly one every few days; streak-saves are capped to once per day.
 */

const DAY = 86_400_000
const MAX_PER_RUN = 300
const NUDGE_COOLDOWN_DAYS = 5
const LAPSE_MIN_DAYS = 3
const LAPSE_MAX_DAYS = 21
const STREAK_MIN = 3

/** Whole days from `date` to `now`, never negative. Pure + testable. */
export function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY))
}

type EnrollLite = {
  progressPct: number
  status: string
  enrolledAt: Date
  course: { id: string; title: string; slug: string }
}

/**
 * The best course to pull a learner back to: the one they're furthest into but
 * haven't finished; failing that, the newest they enrolled in but never started.
 * Returns null when everything is done. Pure + testable.
 */
export function pickResumeCourse(
  enrollments: EnrollLite[],
): { course: EnrollLite['course']; progressPct: number } | null {
  const inProgress = enrollments.filter((e) => e.progressPct > 0 && e.progressPct < 100)
  if (inProgress.length) {
    const best = inProgress.reduce((a, b) => (b.progressPct > a.progressPct ? b : a))
    return { course: best.course, progressPct: best.progressPct }
  }
  const notStarted = enrollments.filter((e) => e.progressPct === 0 && e.status !== 'COMPLETED')
  if (notStarted.length) {
    const newest = notStarted.reduce((a, b) => (b.enrolledAt > a.enrolledAt ? b : a))
    return { course: newest.course, progressPct: 0 }
  }
  return null
}

export type NudgeSummary = { streakSaves: number; continues: number; comebacks: number }

type NudgeKind = 'streak' | 'continue' | 'comeback'

export async function sendReengagementNudges(
  opts: { now?: Date; dryRun?: boolean } = {},
): Promise<NudgeSummary> {
  const now = opts.now ?? new Date()
  const dryRun = opts.dryRun ?? false
  const summary: NudgeSummary = { streakSaves: 0, continues: 0, comebacks: 0 }

  const setMax = (m: Map<string, Date>, k: string, d: Date) => {
    const cur = m.get(k)
    if (!cur || d > cur) m.set(k, d)
  }

  // Last activity per user, from the two things that count as "learning".
  const [lpMax, taMax] = await Promise.all([
    prisma.lessonProgress.groupBy({ by: ['userId'], _max: { completedAt: true } }),
    prisma.testAttempt.groupBy({ by: ['userId'], _max: { submittedAt: true } }),
  ])
  const lastAct = new Map<string, Date>()
  for (const r of lpMax) if (r._max.completedAt) setMax(lastAct, r.userId, r._max.completedAt)
  for (const r of taMax) if (r._max.submittedAt) setMax(lastAct, r.userId, r._max.submittedAt)

  // When each user was last nudged, to honour the cooldown.
  const cooldownSince = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * DAY)
  const recent = await prisma.notification.findMany({
    where: { type: 'REMINDER', createdAt: { gte: cooldownSince } },
    select: { userId: true, createdAt: true },
  })
  const lastReminder = new Map<string, Date>()
  for (const r of recent) setMax(lastReminder, r.userId, r.createdAt)

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', enrollments: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      notificationPreference: { select: { channels: true } },
      enrollments: {
        select: {
          progressPct: true,
          status: true,
          enrolledAt: true,
          course: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  })

  const todayKey = dayKeyIST(now)
  const yesterdayKey = dayKeyIST(new Date(now.getTime() - DAY))

  for (const s of students) {
    if (summary.streakSaves + summary.continues + summary.comebacks >= MAX_PER_RUN) break

    const last = lastAct.get(s.id) ?? null
    const remindedAt = lastReminder.get(s.id) ?? null
    const emailAllowed = wants(resolvePrefs(s.notificationPreference?.channels), 'REMINDER', 'email')

    // ---- streak save: active yesterday, not today, streak ≥ 3 ----
    if (last && dayKeyIST(last) === yesterdayKey) {
      const remindedToday = remindedAt ? dayKeyIST(remindedAt) === todayKey : false
      if (!remindedToday) {
        const snap = await getStreakSnapshot(s.id)
        if (snap.current >= STREAK_MIN) {
          await fire(s, { kind: 'streak', streakDays: snap.current }, dryRun, emailAllowed)
          summary.streakSaves++
        }
      }
      continue // active yesterday isn't a lapse
    }

    // General nudges respect the cooldown.
    if (remindedAt) continue

    // ---- lapsed: continue or comeback ----
    const earliest = s.enrollments.length
      ? s.enrollments.reduce((a, b) => (b.enrolledAt < a.enrolledAt ? b : a)).enrolledAt
      : null
    const reference = last ?? earliest
    if (!reference) continue
    const days = daysSince(reference, now)
    if (days < LAPSE_MIN_DAYS || days > LAPSE_MAX_DAYS) continue

    const resume = pickResumeCourse(s.enrollments)
    if (!resume) continue // finished everything — not a lapse to chase

    if (resume.progressPct > 0) {
      await fire(s, { kind: 'continue', course: resume.course, progressPct: resume.progressPct }, dryRun, emailAllowed)
      summary.continues++
    } else {
      await fire(s, { kind: 'comeback', course: resume.course }, dryRun, emailAllowed)
      summary.comebacks++
    }
  }

  return summary
}

async function fire(
  student: { id: string; name: string; email: string },
  n: {
    kind: NudgeKind
    course?: { id: string; title: string; slug: string }
    streakDays?: number
    progressPct?: number
  },
  dryRun: boolean,
  emailAllowed: boolean,
): Promise<void> {
  if (dryRun) return

  const path = n.course ? `/dashboard/learn/${n.course.id}` : n.kind === 'streak' ? '/dashboard/goals' : '/dashboard'

  const inApp =
    n.kind === 'streak'
      ? { title: `Keep your ${n.streakDays}-day streak alive 🔥`, body: 'Do one lesson today so your streak doesn’t reset.' }
      : n.kind === 'continue'
        ? { title: `Continue ${n.course!.title}`, body: `You’re ${n.progressPct}% through — pick up where you left off.` }
        : { title: `Ready to start ${n.course!.title}?`, body: 'Your classroom is waiting whenever you are.' }

  // In-app notification (also serves as the cooldown marker). Preference-gated by
  // notify(); email:false because the tailored reminderEmail below is our email.
  await notify(student.id, { type: 'REMINDER', title: inApp.title, body: inApp.body, url: path }, { email: false })

  // Tailored email — only when the student wants reminder emails; best-effort and
  // no-ops when the mailer isn't configured.
  if (emailAllowed) {
    try {
      await sendEmail(
        student.email,
        reminderEmail({
          name: student.name,
          kind: n.kind,
          courseTitle: n.course?.title,
          path,
          streakDays: n.streakDays,
          progressPct: n.progressPct,
        }),
      )
    } catch (err) {
      captureError(err, { scope: 'reminders/email', userId: student.id })
    }
  }
}
