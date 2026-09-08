import { prisma } from '@/lib/prisma'
import { captureError } from '@/lib/observability'

/**
 * Learner notifications — the write side.
 *
 * A notification is a nicety, never load-bearing: a paid enrolment or an issued
 * certificate must not roll back because we couldn't write a bell item. So every
 * function here is best-effort and swallows its own errors after capturing them.
 */

export type NotificationType =
  | 'ENROLMENT'
  | 'CERTIFICATE'
  | 'TEST'
  | 'MATERIAL'
  | 'LIVE'
  | 'GENERAL'

export interface NotifyInput {
  type: NotificationType
  title: string
  body?: string | null
  /** In-app deep link the card opens when clicked. */
  url?: string | null
}

/** Records one notification for one student. */
export async function notify(userId: string, input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        url: input.url ?? null,
      },
    })
  } catch (error) {
    captureError(error, { scope: 'notify', userId, type: input.type })
  }
}

/**
 * Fans the same notification out to many students in a single insert — for
 * course-wide events like a new material or a scheduled live class.
 */
export async function notifyMany(userIds: string[], input: NotifyInput): Promise<void> {
  const ids = [...new Set(userIds)]
  if (ids.length === 0) return
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        url: input.url ?? null,
      })),
    })
  } catch (error) {
    captureError(error, { scope: 'notifyMany', count: ids.length, type: input.type })
  }
}
