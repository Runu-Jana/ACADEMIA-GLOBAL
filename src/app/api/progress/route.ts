import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { pct } from '@/lib/utils'

const schema = z.object({
  lessonId: z.string().trim().min(1, 'Lesson is required'),
  completed: z.boolean().default(true),
})

/** "Diploma in Digital Marketing" → "DDM" (padded so it's always 3 chars). */
function courseCode(title: string) {
  const letters = title
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return `${letters}XXX`.slice(0, 3)
}

/** AG-2026-DDM-004821 — retried until it doesn't collide with an issued serial. */
async function nextSerial(courseTitle: string) {
  const year = new Date().getFullYear()
  const code = courseCode(courseTitle)

  for (let i = 0; i < 8; i++) {
    const n = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
    const serial = `AG-${year}-${code}-${n}`
    const clash = await prisma.certificate.findUnique({ where: { serial }, select: { id: true } })
    if (!clash) return serial
  }
  return `AG-${year}-${code}-${String(Date.now()).slice(-6)}`
}

/** Letter grade from the learner's best attempt on each test in the course. */
async function gradeFor(userId: string, courseId: string) {
  const attempts = await prisma.testAttempt.findMany({
    where: { userId, test: { module: { courseId } } },
    select: { testId: true, score: true, totalMarks: true },
  })
  if (!attempts.length) return 'A'

  const best = new Map<string, number>()
  for (const a of attempts) {
    const ratio = a.totalMarks > 0 ? a.score / a.totalMarks : 0
    best.set(a.testId, Math.max(best.get(a.testId) ?? 0, ratio))
  }

  const values = [...best.values()]
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  if (avg >= 0.85) return 'A+'
  if (avg >= 0.7) return 'A'
  if (avg >= 0.55) return 'B+'
  return 'B'
}

/**
 * Marks a lesson complete (or clears it), recalculates the enrolment
 * percentage, and auto-issues a certificate the moment the course hits 100%.
 * Returns the fresh numbers so the player can update without a reload.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid details' },
      { status: 400 },
    )
  }

  const { lessonId, completed } = parsed.data
  const userId = session.userId

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      module: { select: { courseId: true, course: { select: { title: true } } } },
    },
  })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const courseId = lesson.module.courseId

  // Ownership check — you can only record progress on your own enrolment.
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (!enrollment) {
    return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
  }

  if (completed) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    })
  } else {
    await prisma.lessonProgress.deleteMany({ where: { userId, lessonId } })
  }

  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { module: { courseId } } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { module: { courseId } } } }),
  ])

  const progressPct = pct(completedLessons, totalLessons)
  const isComplete = totalLessons > 0 && completedLessons >= totalLessons

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPct,
      status: isComplete ? 'COMPLETED' : 'ACTIVE',
      completedAt: isComplete ? (enrollment.completedAt ?? new Date()) : null,
    },
  })

  let certificate: { serial: string; grade: string } | null = null
  if (isComplete) {
    const existing = await prisma.certificate.findUnique({
      where: { enrollmentId: enrollment.id },
      select: { serial: true, grade: true },
    })

    if (existing) {
      certificate = existing
    } else {
      try {
        certificate = await prisma.certificate.create({
          data: {
            serial: await nextSerial(lesson.module.course.title),
            grade: await gradeFor(userId, courseId),
            userId,
            courseId,
            enrollmentId: enrollment.id,
          },
          select: { serial: true, grade: true },
        })
      } catch {
        // Two tabs finishing the last lesson at once — one insert wins, reuse it.
        certificate = await prisma.certificate.findUnique({
          where: { enrollmentId: enrollment.id },
          select: { serial: true, grade: true },
        })
      }
    }
  }

  return NextResponse.json({
    ok: true,
    lessonId,
    completed,
    progressPct,
    completedLessons,
    totalLessons,
    status: isComplete ? 'COMPLETED' : 'ACTIVE',
    certificate,
  })
}
