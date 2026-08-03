import { prisma } from '@/lib/prisma'
import type { StudentContext } from './career-kit'

/**
 * Loads the real, verifiable slice of a student's Academia Global record that
 * the Career Kit tools ground their output in. Kept here (not in career-kit.ts)
 * so the model layer stays free of database concerns, matching the resume tool.
 */
export async function loadStudentContext(
  userId: string,
  name: string,
): Promise<StudentContext> {
  const [enrollments, certs] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      select: { course: { select: { title: true, stream: true } } },
    }),
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      select: { course: { select: { title: true } } },
    }),
  ])

  const courses = enrollments.map((e) => e.course.title)
  const streams = [...new Set(enrollments.map((e) => e.course.stream).filter(Boolean))]
  const certificates = certs.map((c) => c.course.title)

  return { name, courses, streams, certificates }
}

/** One-line grounding note shown under a Career Kit form. */
export async function loadRecordSummary(userId: string): Promise<string> {
  const [certCount, courseCount] = await Promise.all([
    prisma.certificate.count({ where: { userId } }),
    prisma.enrollment.count({ where: { userId } }),
  ])
  return `Your ${certCount} verified certificate${certCount === 1 ? '' : 's'} and ${courseCount} programme${courseCount === 1 ? '' : 's'} from Academia Global are used automatically.`
}
