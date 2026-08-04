import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Wand2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { GenerateStructure } from '@/components/admin/generate-structure'
import { StructureEditor } from '@/components/admin/academics-structure'
import { ResultsEditor } from '@/components/admin/academics-results'

export const metadata: Metadata = { title: 'Course Academics' }
export const dynamic = 'force-dynamic'

export default async function AdminCourseAcademicsPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireAdmin()
  const { courseId } = await params

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      terms: {
        orderBy: { number: 'asc' },
        select: {
          id: true, number: true, title: true, creditsRequired: true,
          subjects: {
            orderBy: { code: 'asc' },
            select: { id: true, code: true, title: true, credits: true, kind: true, internalMarks: true, externalMarks: true },
          },
        },
      },
    },
  })
  if (!course) notFound()

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { enrolledAt: 'asc' },
  })
  const students = enrollments.map((e) => e.user)

  const allSubjects = course.terms.flatMap((t) => t.subjects)
  const subjectIds = allSubjects.map((s) => s.id)
  const results = subjectIds.length
    ? await prisma.subjectResult.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { subjectId: true, userId: true, internalScore: true, externalScore: true, grade: true },
      })
    : []

  const hasStructure = course.terms.length > 0

  return (
    <>
      <Link
        href="/admin/academics"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Academics
      </Link>

      <PageHeader title={course.title} sub="Semesters, subjects and results for this programme." />

      {!hasStructure ? (
        <div className="card-base holo-ring flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-holo-sweep shadow-glow">
            <Wand2 className="h-7 w-7 text-white" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">No academic structure yet</h2>
            <p className="mx-auto mt-1.5 max-w-md text-pretty text-[13.5px] text-muted-foreground">
              Generate semesters and subjects from this course&rsquo;s modules — then fine-tune them and
              enter results. You can also build it by hand.
            </p>
          </div>
          <GenerateStructure courseId={course.id} size="lg" />
        </div>
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-2">
          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Structure</h2>
            <StructureEditor courseId={course.id} terms={course.terms} />
          </section>

          <section>
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              Results &amp; SGPA
            </h2>
            <ResultsEditor
              subjects={allSubjects.map((s) => ({
                id: s.id, code: s.code, title: s.title, internalMarks: s.internalMarks, externalMarks: s.externalMarks,
              }))}
              students={students}
              results={results}
            />
          </section>
        </div>
      )}
    </>
  )
}
