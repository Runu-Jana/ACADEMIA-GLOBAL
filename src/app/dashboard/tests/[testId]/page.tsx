import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { TestRunner, type RunnerQuestion } from '@/components/dashboard/test-runner'
import { asList } from '@/lib/utils'

type PageProps = { params: Promise<{ testId: string }> }

const TEST_TYPE_LABEL: Record<string, string> = {
  QUIZ: 'Module Quiz',
  MID_TERM: 'Mid-Term Exam',
  FINAL: 'Final Exam',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { testId } = await params
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { title: true } })
  return { title: test?.title ?? 'Test' }
}

export default async function TakeTestPage({ params }: PageProps) {
  const { testId } = await params
  const user = await requireUser(`/dashboard/tests/${testId}`)

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      title: true,
      type: true,
      totalMarks: true,
      passMarks: true,
      durationMin: true,
      module: {
        select: {
          title: true,
          course: { select: { id: true, title: true } },
        },
      },
      // correctIndex is deliberately absent — answers are only revealed by the
      // submit endpoint, after an attempt has been recorded.
      questions: {
        orderBy: { order: 'asc' },
        select: { id: true, text: true, options: true, marks: true },
      },
    },
  })
  if (!test) notFound()

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: test.module.course.id } },
    select: { id: true },
  })
  if (!enrollment) notFound()

  const attempts = await prisma.testAttempt.findMany({
    where: { userId: user.id, testId: test.id },
    orderBy: { score: 'desc' },
    select: { score: true, totalMarks: true },
  })

  const questions: RunnerQuestion[] = test.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: asList(q.options),
    marks: q.marks,
  }))

  return (
    <TestRunner
      testId={test.id}
      title={test.title}
      typeLabel={TEST_TYPE_LABEL[test.type] ?? test.type}
      durationMin={test.durationMin}
      totalMarks={questions.reduce((s, q) => s + q.marks, 0) || test.totalMarks}
      passMarks={test.passMarks}
      courseId={test.module.course.id}
      courseTitle={test.module.course.title}
      moduleTitle={test.module.title}
      questions={questions}
      attemptCount={attempts.length}
      previousBest={attempts[0]?.score ?? null}
      previousTotal={attempts[0]?.totalMarks ?? null}
    />
  )
}
