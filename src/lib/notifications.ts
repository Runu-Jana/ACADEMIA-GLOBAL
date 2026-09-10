import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { notificationEmail } from '@/lib/emails'
import { resolvePrefs, wants } from '@/lib/notification-prefs'
import { captureError } from '@/lib/observability'

/**
 * Learner notifications — the write side.
 *
 * A notification is a nicety, never load-bearing: a paid enrolment or an issued
 * certificate must not roll back because we couldn't write a bell item. So every
 * function here is best-effort and swallows its own errors after capturing them.
 *
 * Each call is preference-aware: it writes the in-app record only if the student
 * wants in-app for that category, and additionally sends a generic email if they
 * want email. Events that ship their own richer email (enrolment receipt,
 * re-engagement nudge) pass `{ email: false }` and gate that email themselves, so
 * nothing is sent twice.
 */

export type NotificationType =
  | 'ENROLMENT'
  | 'CERTIFICATE'
  | 'TEST'
  | 'MATERIAL'
  | 'LIVE'
  | 'ACHIEVEMENT'
  | 'REMINDER'
  | 'GENERAL'

export interface NotifyInput {
  type: NotificationType
  title: string
  body?: string | null
  /** In-app deep link the card opens when clicked. */
  url?: string | null
}

/** `email: false` suppresses the generic email (the caller sends its own). */
export interface NotifyOptions {
  email?: boolean
}

/** Records one notification for one student, honouring their channel preferences. */
export async function notify(userId: string, input: NotifyInput, opts: NotifyOptions = {}): Promise<void> {
  try {
    const prefRow = await prisma.notificationPreference.findUnique({
      where: { userId },
      select: { channels: true },
    })
    const prefs = resolvePrefs(prefRow?.channels)

    if (wants(prefs, input.type, 'inApp')) {
      await prisma.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          url: input.url ?? null,
        },
      })
    }

    if (opts.email !== false && wants(prefs, input.type, 'email')) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
      if (user?.email) {
        await sendEmail(user.email, notificationEmail({ name: user.name, title: input.title, body: input.body, path: input.url }))
      }
    }
  } catch (error) {
    captureError(error, { scope: 'notify', userId, type: input.type })
  }
}

/**
 * Fans the same notification out to many students — for course-wide events like a
 * new material or a scheduled live class. Respects each student's in-app and
 * email preferences.
 */
export async function notifyMany(userIds: string[], input: NotifyInput): Promise<void> {
  const ids = [...new Set(userIds)]
  if (ids.length === 0) return
  try {
    const prefRows = await prisma.notificationPreference.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, channels: true },
    })
    const prefMap = new Map(prefRows.map((r) => [r.userId, resolvePrefs(r.channels)]))
    const prefsFor = (id: string) => prefMap.get(id) ?? resolvePrefs(null)

    const inAppIds = ids.filter((id) => wants(prefsFor(id), input.type, 'inApp'))
    if (inAppIds.length) {
      await prisma.notification.createMany({
        data: inAppIds.map((userId) => ({
          userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          url: input.url ?? null,
        })),
      })
    }

    const emailIds = ids.filter((id) => wants(prefsFor(id), input.type, 'email'))
    if (emailIds.length) {
      const users = await prisma.user.findMany({ where: { id: { in: emailIds } }, select: { email: true, name: true } })
      for (const u of users) {
        if (u.email) {
          await sendEmail(u.email, notificationEmail({ name: u.name, title: input.title, body: input.body, path: input.url }))
        }
      }
    }
  } catch (error) {
    captureError(error, { scope: 'notifyMany', count: ids.length, type: input.type })
  }
}
