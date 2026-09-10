/**
 * Notification preferences — the shared, dependency-free core.
 *
 * Deliberately no prisma/server imports so the settings UI (a client component)
 * can pull in the categories and defaults directly. The DB read lives wherever a
 * caller needs it (notify(), the API route, the settings page).
 *
 * A student's stored preference is a partial JSON map; anything missing falls
 * back to DEFAULT_PREFS, so an absent row means "all defaults" and new categories
 * added later default sensibly without a migration.
 */

export type NotifChannel = 'inApp' | 'email'
export type NotifCategoryKey = 'course' | 'tests' | 'content' | 'reminders' | 'achievements'
export type CategoryPref = { inApp: boolean; email: boolean }
export type ResolvedPrefs = Record<NotifCategoryKey, CategoryPref>

export const NOTIFICATION_CATEGORIES: {
  key: NotifCategoryKey
  label: string
  description: string
  /** NotificationType values that fall under this category. */
  types: string[]
}[] = [
  { key: 'course', label: 'Course & enrolment', description: 'Enrolment confirmations and certificates', types: ['ENROLMENT', 'CERTIFICATE'] },
  { key: 'tests', label: 'Tests & results', description: 'When a test or assignment is graded', types: ['TEST'] },
  { key: 'content', label: 'Material & live classes', description: 'New study material and scheduled live sessions', types: ['MATERIAL', 'LIVE'] },
  { key: 'reminders', label: 'Learning reminders', description: 'Streak and continue-learning nudges', types: ['REMINDER'] },
  { key: 'achievements', label: 'Achievements', description: 'Streak milestones and badges you unlock', types: ['ACHIEVEMENT'] },
]

/** Sensible defaults: everything in-app; email only for the things worth an inbox ping. */
export const DEFAULT_PREFS: ResolvedPrefs = {
  course: { inApp: true, email: true },
  tests: { inApp: true, email: false },
  content: { inApp: true, email: false },
  reminders: { inApp: true, email: true },
  achievements: { inApp: true, email: false },
}

const TYPE_TO_CATEGORY: Record<string, NotifCategoryKey> = Object.fromEntries(
  NOTIFICATION_CATEGORIES.flatMap((c) => c.types.map((t) => [t, c.key] as const)),
)

export function categoryForType(type: string): NotifCategoryKey | null {
  return TYPE_TO_CATEGORY[type] ?? null
}

/** Merge a stored JSON blob over the defaults, ignoring anything unrecognised. */
export function resolvePrefs(stored: unknown): ResolvedPrefs {
  const out: ResolvedPrefs = {
    course: { ...DEFAULT_PREFS.course },
    tests: { ...DEFAULT_PREFS.tests },
    content: { ...DEFAULT_PREFS.content },
    reminders: { ...DEFAULT_PREFS.reminders },
    achievements: { ...DEFAULT_PREFS.achievements },
  }
  if (stored && typeof stored === 'object') {
    const rec = stored as Record<string, unknown>
    for (const c of NOTIFICATION_CATEGORIES) {
      const v = rec[c.key]
      if (v && typeof v === 'object') {
        const cv = v as Record<string, unknown>
        if (typeof cv.inApp === 'boolean') out[c.key].inApp = cv.inApp
        if (typeof cv.email === 'boolean') out[c.key].email = cv.email
      }
    }
  }
  return out
}

/**
 * Whether a notification of `type` should be delivered on `channel`.
 * Uncategorised types (e.g. GENERAL) always go in-app and never email.
 */
export function wants(prefs: ResolvedPrefs, type: string, channel: NotifChannel): boolean {
  const cat = categoryForType(type)
  if (!cat) return channel === 'inApp'
  return prefs[cat][channel]
}

/** Keeps only recognised category/channel booleans — for validating an API payload. */
export function sanitizeChannels(input: unknown): Partial<Record<NotifCategoryKey, CategoryPref>> {
  const clean: Partial<Record<NotifCategoryKey, CategoryPref>> = {}
  if (!input || typeof input !== 'object') return clean
  const rec = input as Record<string, unknown>
  for (const c of NOTIFICATION_CATEGORIES) {
    const v = rec[c.key]
    if (v && typeof v === 'object') {
      const cv = v as Record<string, unknown>
      clean[c.key] = {
        inApp: typeof cv.inApp === 'boolean' ? cv.inApp : DEFAULT_PREFS[c.key].inApp,
        email: typeof cv.email === 'boolean' ? cv.email : DEFAULT_PREFS[c.key].email,
      }
    }
  }
  return clean
}
