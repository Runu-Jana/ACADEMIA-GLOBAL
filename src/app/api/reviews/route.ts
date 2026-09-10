import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  courseId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
})

/**
 * Create or update the signed-in learner's review for a course.
 *
 * Gated on enrolment — only someone who actually took the course may rate it,
 * and the `@@unique([userId, courseId])` constraint keeps it to one review each.
 *
 * `course.rating` / `course.reviews` are denormalised aggregates the cards and
 * catalog read, kept here as a running mean and count: a new review extends the
 * base by one, an edit swaps its own contribution, so the headline number never
 * needs a full re-scan of every row.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    raw = {}
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please choose a star rating and write at least 10 characters.' },
      { status: 400 },
    )
  }
  const { courseId, rating, body } = parsed.data

  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  })
  if (!enrolled) {
    return NextResponse.json(
      { error: 'Only enrolled learners can review this program.' },
      { status: 403 },
    )
  }

  const prev = await prisma.review.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { rating: true },
  })

  await prisma.review.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId, rating, body },
    update: { rating, body },
  })

  await recomputeCourseRating(courseId, prev ? { replace: prev.rating, with: rating } : { add: rating })

  return NextResponse.json({ ok: true, edited: Boolean(prev) })
}

/** Remove the signed-in learner's own review and roll the aggregate back. */
export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  const courseId = new URL(req.url).searchParams.get('courseId') ?? ''
  if (!courseId) return NextResponse.json({ error: 'Missing course.' }, { status: 400 })

  const existing = await prisma.review.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { rating: true },
  })
  if (!existing) return NextResponse.json({ ok: true })

  await prisma.review.delete({
    where: { userId_courseId: { userId: user.id, courseId } },
  })

  await recomputeCourseRating(courseId, { remove: existing.rating })

  return NextResponse.json({ ok: true })
}

type RatingChange =
  | { add: number }
  | { remove: number }
  | { replace: number; with: number }

/** Shift the stored running mean/count by a single review's change. */
async function recomputeCourseRating(courseId: string, change: RatingChange) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { rating: true, reviews: true },
  })
  if (!course) return

  const sum = course.rating * course.reviews
  let count = course.reviews
  let newSum = sum

  if ('add' in change) {
    count += 1
    newSum = sum + change.add
  } else if ('remove' in change) {
    count = Math.max(0, count - 1)
    newSum = sum - change.remove
  } else {
    newSum = sum - change.replace + change.with
  }

  const rating = count > 0 ? Math.round((newSum / count) * 100) / 100 : 0
  await prisma.course.update({
    where: { id: courseId },
    data: { rating, reviews: count },
  })
}
