import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { TestForm } from '@/components/admin/test-form'

export const metadata: Metadata = { title: 'Tests & Exams' }
export const dynamic = 'force-dynamic'

export default async function AdminTestsPage() {
  await requireAdmin()

  const [courses, tests] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }),
    prisma.test.findMany({
      orderBy: [{ module: { course: { title: 'asc' } } }, { title: 'asc' }],
      include: {
        module: { select: { title: true, course: { select: { title: true } } } },
        _count: { select: { questions: true, attempts: true } },
      },
    }),
  ])

  return (
    <>
      <PageHeader
        title="Tests & Exams"
        sub="Author quizzes and exams under a course's modules. Enrolled students take them from their dashboard; scoring is automatic."
      />

      <div className="mb-6">
        <TestForm courses={courses} />
      </div>

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Test</Th>
              <Th>Course · Module</Th>
              <Th>Questions</Th>
              <Th>Marks</Th>
              <Th>Attempts</Th>
              <Th className="text-right">Edit</Th>
            </Thead>
            <Tbody>
              {tests.length === 0 && (
                <TableEmpty colSpan={6}>No tests yet — create one above.</TableEmpty>
              )}

              {tests.map((t) => (
                <tr key={t.id} className="align-top transition-colors hover:bg-muted/40">
                  <Td className="max-w-[16rem]">
                    <Link href={`/admin/tests/${t.id}`} className="font-semibold hover:text-primary-600">
                      {t.title}
                    </Link>
                    <span className="mt-0.5 block">
                      <Badge tone="cyan">{t.type}</Badge>
                    </span>
                  </Td>
                  <Td className="max-w-[16rem] text-muted-foreground">
                    <span className="block truncate text-[12.5px]">{t.module.course.title}</span>
                    <span className="block truncate text-[11px]">{t.module.title}</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {t._count.questions}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {t.totalMarks} total · {t.passMarks} pass
                  </Td>
                  <Td className="text-muted-foreground">{t._count.attempts}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <Link
                        href={`/admin/tests/${t.id}`}
                        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-600 hover:underline"
                      >
                        Edit
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>
    </>
  )
}
