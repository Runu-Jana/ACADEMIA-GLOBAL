import type { Metadata } from 'next'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  PageHeader,
  TableWrap,
  DataTable,
  Thead,
  Tbody,
  Th,
  Td,
  TableEmpty,
  EnrollmentStatusBadge,
} from '@/components/admin/admin-ui'
import { FilterBar } from '@/components/admin/filter-bar'
import { ENROLLMENT_STATUS } from '@/lib/constants'
import { formatDate, initials } from '@/lib/utils'

export const metadata: Metadata = { title: 'Enrolments' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminEnrolmentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q : ''
  const status = typeof sp.status === 'string' ? sp.status : ''
  const courseId = typeof sp.course === 'string' ? sp.course : ''

  const where: Prisma.EnrollmentWhereInput = {
    ...(status && { status }),
    ...(courseId && { courseId }),
    ...(q && {
      OR: [
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { course: { title: { contains: q } } },
      ],
    }),
  }

  const [enrolments, courses, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: 'desc' },
      select: {
        id: true,
        status: true,
        progressPct: true,
        enrolledAt: true,
        completedAt: true,
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, university: { select: { shortName: true } } } },
        certificate: { select: { serial: true } },
      },
    }),
    prisma.course.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }),
    prisma.enrollment.count(),
  ])

  return (
    <>
      <PageHeader
        title="Enrolments"
        sub={`${enrolments.length} of ${total} enrolment${total === 1 ? '' : 's'}`}
      />

      <FilterBar
        basePath="/admin/enrolments"
        values={{ q, status, course: courseId }}
        searchPlaceholder="Search by student or course…"
        selects={[
          {
            name: 'status',
            label: 'All statuses',
            options: ENROLLMENT_STATUS.map((s) => ({ value: s, label: s.toLowerCase() })),
          },
          {
            name: 'course',
            label: 'All courses',
            options: courses.map((c) => ({ value: c.id, label: c.title })),
          },
        ]}
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Student</Th>
              <Th>Course</Th>
              <Th className="w-48">Progress</Th>
              <Th>Status</Th>
              <Th>Certificate</Th>
              <Th>Enrolled</Th>
            </Thead>
            <Tbody>
              {enrolments.length === 0 && (
                <TableEmpty colSpan={6}>No enrolments match those filters.</TableEmpty>
              )}

              {enrolments.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[16rem]">
                    <Link href={`/admin/students/${e.user.id}`} className="group flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-fade text-[11px] font-bold text-white">
                        {initials(e.user.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold transition-colors group-hover:text-primary-600">
                          {e.user.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {e.user.email}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="max-w-[15rem]">
                    <Link
                      href={`/admin/courses/${e.course.id}`}
                      className="block min-w-0 transition-colors hover:text-primary-600"
                    >
                      <span className="line-clamp-2 text-[12.5px] font-medium">{e.course.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {e.course.university.shortName}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Progress value={e.progressPct} className="h-1.5 w-24" />
                      <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-muted-foreground">
                        {e.progressPct}%
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <EnrollmentStatusBadge status={e.status} />
                  </Td>
                  <Td>
                    {e.certificate ? (
                      <Link
                        href={`/verify?serial=${encodeURIComponent(e.certificate.serial)}`}
                        className="font-mono text-[11.5px] font-semibold text-primary-600 hover:underline"
                      >
                        {e.certificate.serial}
                      </Link>
                    ) : (
                      <Badge tone="default">—</Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(e.enrolledAt)}
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
