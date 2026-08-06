import type { Metadata } from 'next'
import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import {
  PageHeader,
  TableWrap,
  DataTable,
  Thead,
  Tbody,
  Th,
  Td,
  TableEmpty,
  StatusBadge,
} from '@/components/admin/admin-ui'
import { FilterBar } from '@/components/admin/filter-bar'
import { ApplicationStatusControl } from '@/components/admin/application-status'
import { APPLICATION_STATUS } from '@/lib/constants'
import { formatDate, initials } from '@/lib/utils'

export const metadata: Metadata = { title: 'Applications' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q : ''
  const status = typeof sp.status === 'string' ? sp.status : ''

  const where: Prisma.ApplicationWhereInput = {
    ...(status && { status }),
    ...(q && {
      OR: [
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { course: { title: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  }

  const [applications, counts] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        step: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        course: { select: { id: true, title: true } },
      },
    }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0

  return (
    <>
      <PageHeader
        title="Applications"
        sub="Move each admission application through the review pipeline."
      />

      {/* -------------------------------------------------- status shortcuts */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <StatusChip href="/admin/applications" label="All" count={counts.reduce((n, c) => n + c._count._all, 0)} active={!status} />
        {APPLICATION_STATUS.map((s) => (
          <StatusChip
            key={s}
            href={`/admin/applications?status=${s}`}
            label={s.replace(/_/g, ' ').toLowerCase()}
            count={countFor(s)}
            active={status === s}
          />
        ))}
      </div>

      <FilterBar
        basePath="/admin/applications"
        values={{ q, status }}
        searchPlaceholder="Search by applicant or course…"
        selects={[
          {
            name: 'status',
            label: 'All statuses',
            options: APPLICATION_STATUS.map((s) => ({
              value: s,
              label: s.replace(/_/g, ' ').toLowerCase(),
            })),
          },
        ]}
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Applicant</Th>
              <Th>Course</Th>
              <Th className="text-center">Step</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
              <Th className="text-right">Review</Th>
            </Thead>
            <Tbody>
              {applications.length === 0 && (
                <TableEmpty colSpan={6}>No applications match those filters.</TableEmpty>
              )}

              {applications.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[17rem]">
                    <Link href={`/admin/students/${a.user.id}`} className="group flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-fade text-[11px] font-bold text-white">
                        {initials(a.user.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold transition-colors group-hover:text-primary-600">
                          {a.user.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {a.user.email}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="max-w-[15rem]">
                    <Link
                      href={`/admin/courses/${a.course.id}`}
                      className="line-clamp-2 text-[12.5px] font-medium transition-colors hover:text-primary-600"
                    >
                      {a.course.title}
                    </Link>
                  </Td>
                  <Td className="text-center tabular-nums text-muted-foreground">{a.step}/4</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(a.updatedAt)}</Td>
                  <Td>
                    <span className="flex justify-end">
                      <ApplicationStatusControl
                        applicationId={a.id}
                        status={a.status}
                        applicantName={a.user.name}
                        disabled={a.status === 'DRAFT'}
                      />
                    </span>
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

function StatusChip({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-50 px-3 py-1.5 text-[12px] font-bold capitalize text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/15 dark:text-primary-200'
          : 'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold capitalize text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600'
      }
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </Link>
  )
}
