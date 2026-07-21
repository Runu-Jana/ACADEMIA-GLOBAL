import { PrismaClient } from '@prisma/client'

/**
 * Derives PMS structure (semesters, subjects, an intake batch, a calendar and
 * a grading scheme) from courses that already have LMS modules.
 *
 * Real partner data will come from the ingestion pipeline; this exists so the
 * academic views have something truthful to render against the seeded
 * catalogue, and so the shape is exercised before a university's data lands.
 */
const prisma = new PrismaClient()

const BANDS = [
  { min: 90, grade: 'O', points: 10 },
  { min: 80, grade: 'A+', points: 9 },
  { min: 70, grade: 'A', points: 8 },
  { min: 60, grade: 'B+', points: 7 },
  { min: 50, grade: 'B', points: 6 },
  { min: 40, grade: 'C', points: 5 },
  { min: 0, grade: 'F', points: 0 },
]

function gradeFor(total: number) {
  const band = BANDS.find((b) => total >= b.min) ?? BANDS[BANDS.length - 1]
  return { grade: band.grade, gradePoints: band.points, passed: band.points > 0 }
}

async function main() {
  console.log('Backfilling programme structure...')

  await prisma.subjectResult.deleteMany()
  await prisma.academicEvent.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.term.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.gradingScheme.deleteMany()

  const scheme = await prisma.gradingScheme.create({
    data: { name: 'Standard 10-point (UGC)', bands: BANDS, maxPoints: 10 },
  })

  const courses = await prisma.course.findMany({
    include: { modules: { orderBy: { order: 'asc' } } },
  })

  let terms = 0
  let subjects = 0

  for (const course of courses) {
    await prisma.course.update({
      where: { id: course.id },
      data: { gradingSchemeId: scheme.id },
    })

    // One intake per course, starting this academic session.
    const start = new Date(2026, 6, 15) // 15 Jul 2026
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

    // Semesters: two per year, at least one.
    const termCount = Math.max(1, Math.round(course.durationYears * 2))
    const perTerm = Math.max(1, Math.ceil(course.modules.length / termCount))

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

        // Attach the LMS module to its subject so lessons hang off the
        // academic structure, not just the flat course.
        await prisma.module.update({
          where: { id: mod.id },
          data: { subjectId: subject.id },
        })
      }

      // Calendar entries for this semester.
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
  }

  // Results for completed semesters of active enrolments, so the academic
  // record and SGPA render against something real.
  const enrolments = await prisma.enrollment.findMany({
    where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
    include: { course: { include: { subjects: { orderBy: { code: 'asc' } } } } },
  })

  let results = 0
  for (const e of enrolments) {
    // Publish results for roughly the share of the course they've completed.
    const upTo = Math.floor((e.progressPct / 100) * e.course.subjects.length)
    for (const [i, subject] of e.course.subjects.slice(0, upTo).entries()) {
      const internal = 20 + ((i * 7) % 11) // deterministic, 20-30
      const external = 42 + ((i * 13) % 29) // deterministic, 42-70
      const total = internal + external
      const { grade, gradePoints, passed } = gradeFor(total)

      await prisma.subjectResult.create({
        data: {
          userId: e.userId,
          subjectId: subject.id,
          internalScore: internal,
          externalScore: external,
          totalScore: total,
          grade,
          gradePoints,
          status: passed ? 'PASS' : 'FAIL',
          publishedAt: new Date(),
        },
      })
      results++
    }

    await prisma.enrollment.update({
      where: { id: e.id },
      data: { batchId: (await prisma.batch.findFirst({ where: { courseId: e.courseId } }))?.id },
    })
  }

  console.log(`  grading scheme  1`)
  console.log(`  batches         ${courses.length}`)
  console.log(`  terms           ${terms}`)
  console.log(`  subjects        ${subjects}`)
  console.log(`  results         ${results}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
