import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { TestSettings } from '@/components/admin/test-settings'
import { QuestionEditor, type QuestionData } from '@/components/admin/question-editor'
import { AssessmentGenerator } from '@/components/admin/assessment-generator'

export const metadata: Metadata = { title: 'Edit Test' }
export const dynamic = 'force-dynamic'

export default async function AdminTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      module: { select: { title: true, course: { select: { title: true } } } },
      questions: { orderBy: { order: 'asc' } },
    },
  })
  if (!test) notFound()

  const questions: QuestionData[] = test.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: (q.options as string[]) ?? [],
    correctIndex: q.correctIndex,
    marks: q.marks,
  }))

  return (
    <>
      <Link
        href="/admin/tests"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tests &amp; Exams
      </Link>

      <PageHeader
        title={test.title}
        sub={`${test.module.course.title} · ${test.module.title}`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20">
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Settings</h2>
          <TestSettings
            id={test.id}
            initial={{
              title: test.title,
              type: test.type,
              totalMarks: test.totalMarks,
              passMarks: test.passMarks,
              durationMin: test.durationMin,
            }}
          />
        </div>

        <div className="min-w-0">
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            Questions ({questions.length})
          </h2>
          <AssessmentGenerator testId={test.id} />
          <QuestionEditor testId={test.id} questions={questions} />
        </div>
      </div>
    </>
  )
}
