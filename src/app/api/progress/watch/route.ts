import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'

/**
 * Saves a learner's partial watch state for a video lesson (how much has been
 * played, where to resume, the watched-second ranges). This is the low-stakes
 * counterpart to /api/progress: it never completes a lesson or touches
 * certificates — the player calls /api/progress once the watched fraction
 * crosses the threshold. Writes are throttled by the client (~every 10s + on
 * pause/leave) and rate-limited here as a backstop.
 */

const schema = z.object({
  lessonId: z.string().trim().min(1),
  watchedPct: z.number().int().min(0).max(100),
  positionSec: z.number().int().min(0).max(24 * 60 * 60),
  // Encoded watched-second ranges, e.g. "0-83,90-94". Bounded so a client
  // can't push an unbounded blob into the row.
  segments: z.string().max(20_000).default(''),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
  }

  const limited = enforceRateLimit(req, 'progress-watch', 60, MINUTE, session.userId)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid details' }, { status: 400 })
  }

  const { lessonId, watchedPct, positionSec, segments } = parsed.data
  const userId = session.userId

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, module: { select: { courseId: true } } },
  })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Only an enrolled learner can record watch progress on this lesson.
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.module.courseId } },
    select: { id: true },
  })
  if (!enrollment) {
    return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
  }

  // watchedPct only ever climbs, so a stale save from another tab can't drag it
  // backwards; the newest segments/position always win for resume.
  const existing = await prisma.lessonWatch.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { watchedPct: true },
  })
  const nextPct = Math.max(watchedPct, existing?.watchedPct ?? 0)

  await prisma.lessonWatch.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, watchedPct: nextPct, positionSec, segments },
    update: { watchedPct: nextPct, positionSec, segments },
  })

  return NextResponse.json({ ok: true, watchedPct: nextPct })
}
