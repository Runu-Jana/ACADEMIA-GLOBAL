import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
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
} from '@/components/admin/admin-ui'
import { FilterBar } from '@/components/admin/filter-bar'
import { formatDate, initials } from '@/lib/utils'

export const metadata: Metadata = { title: 'Students' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q : ''

  const where: Prisma.UserWhereInput = {
    role: 'STUDENT',
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ],
    }),
  }

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        createdAt: true,
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
  ])

  return (
    <>
      <PageHeader
        title="Students"
        sub={`${students.length} of ${total} registered student${total === 1 ? '' : 's'}`}
      />

      <FilterBar
        basePath="/admin/students"
        values={{ q }}
        searchPlaceholder="Search by name, email, phone or city…"
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Student</Th>
              <Th>Phone</Th>
              <Th>City</Th>
              <Th className="text-center">Enrolments</Th>
              <Th>Joined</Th>
              <Th className="text-right">Profile</Th>
            </Thead>
            <Tbody>
              {students.length === 0 && (
                <TableEmpty colSpan={6}>
                  {q ? `No students match “${q}”.` : 'No students have registered yet.'}
                </TableEmpty>
              )}

              {students.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[18rem]">
                    <Link href={`/admin/students/${s.id}`} className="group flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-fade text-[11px] font-bold text-white">
                        {initials(s.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold transition-colors group-hover:text-primary-600">
                          {s.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {s.email}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{s.phone ?? '—'}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {s.city ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {s.city}
                        {s.state ? `, ${s.state}` : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className="text-center font-bold tabular-nums">{s._count.enrollments}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(s.createdAt)}</Td>
                  <Td>
                    <span className="flex justify-end">
                      <Link
                        href={`/admin/students/${s.id}`}
                        aria-label={`Open ${s.name}'s profile`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </Link>
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
