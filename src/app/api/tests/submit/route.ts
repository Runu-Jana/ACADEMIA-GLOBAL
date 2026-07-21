import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const schema = z.object({
  testId: z.string().trim().min(1, 'Test is required'),
  // { [questionId]: selectedOptionIndex } — unanswered questions are omitted.
  answers: z.record(z.string(), z.number().int().min(0).max(50)),
})

/**
 * Scores a quiz attempt. The correct answers never leave the server before a
 * submission, and the client's own scoring (if any) is ignored entirely —
 * marks are recomputed here against Question.correctIndex.
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

  const { testId, answers } = parsed.data
  const userId = session.userId

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      title: true,
      passMarks: true,
      totalMarks: true,
      module: { select: { courseId: true } },
      questions: {
        orderBy: { order: 'asc' },
        select: { id: true, correctIndex: true, marks: true },
      },
    },
  })
  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 })
  }

  // Ownership check — only enrolled learners can attempt a course's tests.
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: test.module.courseId } },
    select: { id: true },
  })
  if (!enrollment) {
    return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 })
  }

  let score = 0
  const review = test.questions.map((q) => {
    const selected = Object.prototype.hasOwnProperty.call(answers, q.id) ? answers[q.id] : null
    const correct = selected === q.correctIndex
    if (correct) score += q.marks
    return { questionId: q.id, correctIndex: q.correctIndex, selectedIndex: selected, correct }
  })

  const totalMarks =
    test.questions.reduce((sum, q) => sum + q.marks, 0) || test.totalMarks
  const passed = score >= test.passMarks

  const attempt = await prisma.testAttempt.create({
    data: {
      testId: test.id,
      userId,
      score,
      totalMarks,
      passed,
      answers,
    },
    select: { id: true, submittedAt: true },
  })

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    score,
    totalMarks,
    passMarks: test.passMarks,
    passed,
    review,
  })
}
