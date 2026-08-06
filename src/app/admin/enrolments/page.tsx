import type { Metadata } from 'next'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { ArrowRight, GraduationCap } from 'lucide-react'
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
import { EnrolmentToolbar } from '@/components/admin/enrolment-toolbar'
import { EnrolmentControls } from '@/components/admin/enrolment-controls'
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
  const from = typeof sp.from === 'string' ? sp.from : ''
  const to = typeof sp.to === 'string' ? sp.to : ''
  const grouped = sp.view === 'grouped'

  // Enrolled-date range.
  const enrolledAt: Prisma.DateTimeFilter = {}
  const fromDate = from ? new Date(from) : null
  if (fromDate && !Number.isNaN(fromDate.getTime())) enrolledAt.gte = fromDate
  const toDate = to ? new Date(to) : null
  if (toDate && !Number.isNaN(toDate.getTime())) {
    toDate.setHours(23, 59, 59, 999) // inclusive of the whole end day
    enrolledAt.lte = toDate
  }

  const where: Prisma.EnrollmentWhereInput = {
    ...(status && { status }),
    ...(courseId && { courseId }),
    ...(q && {
      OR: [
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { course: { title: { contains: q, mode: 'insensitive' } } },
      ],
    }),
    ...((enrolledAt.gte || enrolledAt.lte) && { enrolledAt }),
  }

  const courses = await prisma.course.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } })
  const total = await prisma.enrollment.count()

  const values = { q, status, course: courseId, from, to, view: grouped ? 'grouped' : '' }

  const filters = (
    <>
      <FilterBar
        basePath="/admin/enrolments"
        values={values}
        searchPlaceholder="Search by student or course…"
        selects={[
          { name: 'status', label: 'All statuses', options: ENROLLMENT_STATUS.map((s) => ({ value: s, label: s.toLowerCase() })) },
          { name: 'course', label: 'All courses', options: courses.map((c) => ({ value: c.id, label: c.title })) },
        ]}
      />
      <EnrolmentToolbar values={values} />
    </>
  )

  // ------------------------------------------------------- grouped by course
  if (grouped) {
    const [byCourse, byCourseStatus] = await Promise.all([
      prisma.enrollment.groupBy({ by: ['courseId'], where, _count: { _all: true } }),
      prisma.enrollment.groupBy({ by: ['courseId', 'status'], where, _count: { _all: true } }),
    ])

    const ids = byCourse.map((g) => g.courseId)
    const info = ids.length
      ? await prisma.course.findMany({
          where: { id: { in: ids } },
          select: { id: true, title: true, university: { select: { shortName: true } } },
        })
      : []
    const infoById = new Map(info.map((c) => [c.id, c]))

    const statusByCourse = new Map<string, Record<string, number>>()
    for (const g of byCourseStatus) {
      const m = statusByCourse.get(g.courseId) ?? {}
      m[g.status] = g._count._all
      statusByCourse.set(g.courseId, m)
    }

    const groups = byCourse
      .map((g) => ({
        courseId: g.courseId,
        title: infoById.get(g.courseId)?.title ?? '—',
        shortName: infoById.get(g.courseId)?.university.shortName ?? '',
        total: g._count._all,
        statuses: statusByCourse.get(g.courseId) ?? {},
      }))
      .sort((a, b) => b.total - a.total)

    const grandTotal = groups.reduce((s, g) => s + g.total, 0)

    return (
      <>
        <PageHeader title="Enrolments" sub={`${groups.length} course${groups.length === 1 ? '' : 's'} · ${grandTotal} enrolment${grandTotal === 1 ? '' : 's'} in view`} />
        {filters}

        <div className="card-base overflow-hidden">
          <TableWrap>
            <DataTable>
              <Thead>
                <Th>Course</Th>
                <Th>Students</Th>
                <Th>Breakdown</Th>
                <Th className="text-right">View</Th>
              </Thead>
              <Tbody>
                {groups.length === 0 && <TableEmpty colSpan={4}>No enrolments match those filters.</TableEmpty>}
                {groups.map((g) => (
                  <tr key={g.courseId} className="align-top transition-colors hover:bg-muted/40">
                    <Td className="max-w-[22rem]">
                      <span className="line-clamp-2 font-semibold">{g.title}</span>
                      {g.shortName && <span className="block text-[11px] text-muted-foreground">{g.shortName}</span>}
                    </Td>
                    <Td>
                      <span className="text-[15px] font-bold tabular-nums">{g.total}</span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {ENROLLMENT_STATUS.filter((s) => g.statuses[s]).map((s) => (
                          <span key={s} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {g.statuses[s]} {s.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/enrolments?course=${g.courseId}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`}
                          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-600 hover:underline"
                        >
                          <GraduationCap className="h-3.5 w-3.5" />
                          Students
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

  // -------------------------------------------------------------- list view
  const enrolments = await prisma.enrollment.findMany({
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
  })

  return (
    <>
      <PageHeader title="Enrolments" sub={`${enrolments.length} of ${total} enrolment${total === 1 ? '' : 's'}`} />
      {filters}

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
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {enrolments.length === 0 && (
                <TableEmpty colSpan={7}>No enrolments match those filters.</TableEmpty>
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
                  <Td>
                    <EnrolmentControls id={e.id} status={e.status} />
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
