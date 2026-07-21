import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'My Learning' }

/**
 * "My Learning" jump-off point: drops the learner straight into the course
 * they were last working on, at the next lesson they haven't finished.
 * Falls back to the course list when there is nothing in flight.
 */
export default async function ContinueLearningPage() {
  const user = await requireUser('/dashboard/learn/continue')

  const enrollment =
    (await prisma.enrollment.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      orderBy: [{ progressPct: 'desc' }, { enrolledAt: 'desc' }],
      select: { courseId: true },
    })) ??
    (await prisma.enrollment.findFirst({
      where: { userId: user.id },
      orderBy: { enrolledAt: 'desc' },
      select: { courseId: true },
    }))

  if (!enrollment) redirect('/dashboard/learn')

  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId: enrollment.courseId } },
    orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
    select: { id: true, progress: { where: { userId: user.id }, select: { id: true } } },
  })

  const next = lessons.find((l) => l.progress.length === 0)
  redirect(
    next
      ? `/dashboard/learn/${enrollment.courseId}?lesson=${next.id}`
      : `/dashboard/learn/${enrollment.courseId}`,
  )
}
