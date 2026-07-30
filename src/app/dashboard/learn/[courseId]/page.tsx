import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import {
  CoursePlayer,
  type PlayerMaterial,
  type PlayerTest,
} from '@/components/dashboard/course-player'

type PageProps = {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ lesson?: string | string[] }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseId } = await params
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  })
  return { title: course?.title ?? 'My Learning' }
}

export default async function LearnCoursePage({ params, searchParams }: PageProps) {
  const { courseId } = await params
  const { lesson } = await searchParams
  const user = await requireUser(`/dashboard/learn/${courseId}`)

  // Guard: only enrolled learners can open the classroom.
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: {
      id: true,
      progressPct: true,
      status: true,
      certificate: { select: { serial: true } },
    },
  })
  if (!enrollment) notFound()

  const [course, progressRows, materials, attempts] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        university: { select: { name: true } },
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                durationMin: true,
                body: true,
              },
            },
            tests: {
              select: {
                id: true,
                title: true,
                type: true,
                totalMarks: true,
                passMarks: true,
                durationMin: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId: user.id, lesson: { module: { courseId } } },
      select: { lessonId: true },
    }),
    prisma.material.findMany({
      where: { courseId },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        type: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        module: { select: { title: true } },
      },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id, test: { module: { courseId } } },
      select: { testId: true, score: true, totalMarks: true, passed: true },
    }),
  ])

  if (!course) notFound()

  const materialProps: PlayerMaterial[] = materials.map((m) => ({
    id: m.id,
    title: m.title,
    type: m.type,
    fileUrl: m.fileUrl,
    fileName: m.fileName,
    fileSize: m.fileSize,
    createdAt: m.createdAt.toISOString(),
    moduleTitle: m.module?.title ?? null,
  }))

  const testProps: PlayerTest[] = course.modules.flatMap((m) =>
    m.tests.map((t) => {
      const mine = attempts.filter((a) => a.testId === t.id)
      const best = mine.reduce<(typeof mine)[number] | null>(
        (top, a) => (!top || a.score > top.score ? a : top),
        null,
      )
      return {
        id: t.id,
        title: t.title,
        type: t.type,
        totalMarks: t.totalMarks,
        passMarks: t.passMarks,
        durationMin: t.durationMin,
        questionCount: t._count.questions,
        moduleTitle: m.title,
        attempts: mine.length,
        bestScore: best?.score ?? null,
        bestTotal: best?.totalMarks ?? null,
        passed: mine.some((a) => a.passed),
      }
    }),
  )

  const initialLessonId = Array.isArray(lesson) ? (lesson[0] ?? null) : (lesson ?? null)

  // All lessons finished, but a course test is still unpassed and no certificate
  // has issued → the player nudges the learner to their assessments.
  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0)
  const initialAssessmentPending =
    totalLessons > 0 &&
    progressRows.length >= totalLessons &&
    !testProps.every((t) => t.passed) &&
    !enrollment.certificate

  return (
    <CoursePlayer
      courseId={course.id}
      courseTitle={course.title}
      courseSlug={course.slug}
      universityName={course.university.name}
      userName={user.name}
      modules={course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        lessons: m.lessons,
      }))}
      materials={materialProps}
      tests={testProps}
      completedLessonIds={progressRows.map((p) => p.lessonId)}
      initialProgressPct={enrollment.progressPct}
      initialLessonId={initialLessonId}
      certificateSerial={enrollment.certificate?.serial ?? null}
      initialAssessmentPending={initialAssessmentPending}
    />
  )
}
