import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, GraduationCap } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader, TableWrap, DataTable, Thead, Tbody, Th, Td, TableEmpty } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { GenerateStructure } from '@/components/admin/generate-structure'

export const metadata: Metadata = { title: 'Academics' }
export const dynamic = 'force-dynamic'

export default async function AdminAcademicsPage() {
  await requireAdmin()

  const courses = await prisma.course.findMany({
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      durationYears: true,
      _count: { select: { terms: true, subjects: true, enrollments: true } },
    },
  })

  return (
    <>
      <PageHeader
        title="Academics"
        sub="Give each course its academic structure — semesters, subjects and credits — then enter results. This is what drives every student's SGPA/CGPA and academic record."
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Course</Th>
              <Th>Semesters</Th>
              <Th>Subjects</Th>
              <Th>Students</Th>
              <Th className="text-right">Manage</Th>
            </Thead>
            <Tbody>
              {courses.length === 0 && <TableEmpty colSpan={5}>No courses yet.</TableEmpty>}

              {courses.map((c) => {
                const structured = c._count.terms > 0
                return (
                  <tr key={c.id} className="align-top transition-colors hover:bg-muted/40">
                    <Td className="max-w-[18rem]">
                      <Link href={`/admin/academics/${c.id}`} className="font-semibold hover:text-primary-600">
                        {c.title}
                      </Link>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{c.durationYears} yr</span>
                    </Td>
                    <Td>
                      {structured ? (
                        <span className="text-muted-foreground">{c._count.terms}</span>
                      ) : (
                        <Badge tone="warning">not set up</Badge>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">{c._count.subjects}</Td>
                    <Td className="text-muted-foreground">{c._count.enrollments}</Td>
                    <Td>
                      <div className="flex justify-end">
                        {structured ? (
                          <Link
                            href={`/admin/academics/${c.id}`}
                            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-600 hover:underline"
                          >
                            <GraduationCap className="h-3.5 w-3.5" />
                            Manage
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <GenerateStructure courseId={c.id} />
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </Tbody>
          </DataTable>
        </TableWrap>
      </div>
    </>
  )
}
