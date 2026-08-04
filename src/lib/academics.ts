import { prisma } from '@/lib/prisma'

/**
 * Programme-management (PMS) helpers shared by the admin routes.
 *
 * The academic layer — semesters, subjects, credits, grading, results — is what
 * drives the student's SGPA/CGPA view. This module owns the grade curve and the
 * one-click structure generator so those rules live in one place.
 */

export const GRADE_BANDS = [
  { min: 90, grade: 'O', points: 10 },
  { min: 80, grade: 'A+', points: 9 },
  { min: 70, grade: 'A', points: 8 },
  { min: 60, grade: 'B+', points: 7 },
  { min: 50, grade: 'B', points: 6 },
  { min: 40, grade: 'C', points: 5 },
  { min: 0, grade: 'F', points: 0 },
] as const

/** Marks (0-100) → grade + grade points on the standard 10-point UGC curve. */
export function gradeFor(total: number) {
  const band = GRADE_BANDS.find((b) => total >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1]
  return { grade: band.grade, gradePoints: band.points, passed: band.points > 0 }
}

export type GenerateResult =
  | { ok: true; terms: number; subjects: number }
  | { ok: false; reason: 'not_found' | 'exists' }

/**
 * Derives a course's academic structure from its LMS modules: two semesters per
 * year, its modules distributed across them as credit-bearing subjects, an
 * intake batch and a term calendar. Idempotent — refuses if terms already exist,
 * so it can't duplicate a structure or orphan published results.
 */
export async function generateCourseStructure(courseId: string): Promise<GenerateResult> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: { orderBy: { order: 'asc' } }, terms: { select: { id: true } } },
  })
  if (!course) return { ok: false, reason: 'not_found' }
  if (course.terms.length > 0) return { ok: false, reason: 'exists' }

  const scheme =
    (await prisma.gradingScheme.findFirst()) ??
    (await prisma.gradingScheme.create({
      data: { name: 'Standard 10-point (UGC)', bands: GRADE_BANDS as unknown as object, maxPoints: 10 },
    }))
  await prisma.course.update({ where: { id: course.id }, data: { gradingSchemeId: scheme.id } })

  const start = new Date()
  const end = new Date(start)
  end.setMonth(end.getMonth() + Math.round(course.durationYears * 12))
  const batch = await prisma.batch.create({
    data: {
      courseId: course.id,
      name: `${start.getFullYear()}-${String(end.getFullYear()).slice(2)}`,
      intakeMonth: 'JULY',
      startDate: start,
      endDate: end,
      seats: 120,
      status: 'RUNNING',
    },
  })

  const termCount = Math.max(1, Math.round(course.durationYears * 2))
  const perTerm = Math.max(1, Math.ceil((course.modules.length || termCount) / termCount))
  let terms = 0
  let subjects = 0

  for (let i = 0; i < termCount; i++) {
    const slice = course.modules.slice(i * perTerm, (i + 1) * perTerm)
    const term = await prisma.term.create({
      data: {
        courseId: course.id,
        number: i + 1,
        title: `Semester ${i + 1}`,
        creditsRequired: Math.max(16, slice.length * 4),
      },
    })
    terms++

    for (const [j, mod] of slice.entries()) {
      const subject = await prisma.subject.create({
        data: {
          courseId: course.id,
          termId: term.id,
          code: `${course.slug.slice(0, 6).toUpperCase()}-${i + 1}0${j + 1}`,
          title: mod.title,
          credits: 4,
          kind: /project|capstone/i.test(mod.title) ? 'PROJECT' : 'CORE',
          internalMarks: 30,
          externalMarks: 70,
          syllabusOutline: mod.description,
        },
      })
      subjects++
      await prisma.module.update({ where: { id: mod.id }, data: { subjectId: subject.id } })
    }

    const termStart = new Date(start)
    termStart.setMonth(termStart.getMonth() + i * 6)
    const examStart = new Date(termStart)
    examStart.setMonth(examStart.getMonth() + 5)
    await prisma.academicEvent.createMany({
      data: [
        { batchId: batch.id, type: 'TERM_START', title: `Semester ${i + 1} begins`, startsAt: termStart },
        { batchId: batch.id, type: 'EXAM', title: `Semester ${i + 1} end-term exams`, startsAt: examStart },
      ],
    })
  }

  return { ok: true, terms, subjects }
}
