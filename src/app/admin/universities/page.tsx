import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, MapPin } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { UniversityMark } from '@/components/course/course-thumb'
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
import { asList, formatCount } from '@/lib/utils'

export const metadata: Metadata = { title: 'Universities' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminUniversitiesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q : ''
  const featured = typeof sp.featured === 'string' ? sp.featured : ''

  const where: Prisma.UniversityWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q } },
        { shortName: { contains: q } },
        { city: { contains: q } },
        { state: { contains: q } },
      ],
    }),
    ...(featured === 'yes' && { featured: true }),
    ...(featured === 'no' && { featured: false }),
  }

  const universities = await prisma.university.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      city: true,
      state: true,
      estYear: true,
      naacGrade: true,
      approvals: true,
      rating: true,
      reviews: true,
      students: true,
      featured: true,
      _count: { select: { courses: true } },
    },
  })

  return (
    <>
      <PageHeader
        title="Universities"
        sub="Partner institutions and the programmes they run on the platform."
      />

      <FilterBar
        basePath="/admin/universities"
        values={{ q, featured }}
        searchPlaceholder="Search by name, city or state…"
        selects={[
          {
            name: 'featured',
            label: 'All institutions',
            options: [
              { value: 'yes', label: 'Featured only' },
              { value: 'no', label: 'Not featured' },
            ],
          },
        ]}
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>University</Th>
              <Th>Location</Th>
              <Th>Approvals</Th>
              <Th className="text-center">Courses</Th>
              <Th className="text-center">Students</Th>
              <Th>Rating</Th>
              <Th className="text-right">Site</Th>
            </Thead>
            <Tbody>
              {universities.length === 0 && (
                <TableEmpty colSpan={7}>No universities match those filters.</TableEmpty>
              )}

              {universities.map((u) => {
                const approvals = asList(u.approvals)
                return (
                  <tr key={u.id} className="transition-colors hover:bg-muted/40">
                    <Td className="max-w-[18rem]">
                      <span className="flex items-center gap-2.5">
                        <UniversityMark name={u.name} size={34} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-semibold">{u.name}</span>
                            {u.featured && (
                              <Badge tone="holo" className="shrink-0">
                                Featured
                              </Badge>
                            )}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            Est. {u.estYear}
                            {u.naacGrade ? ` · NAAC ${u.naacGrade}` : ''}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {u.city}, {u.state}
                      </span>
                    </Td>
                    <Td className="max-w-[13rem]">
                      <span className="flex flex-wrap gap-1">
                        {approvals.slice(0, 3).map((a) => (
                          <Badge key={a} tone="success">
                            {a}
                          </Badge>
                        ))}
                        {approvals.length > 3 && (
                          <Badge tone="default">+{approvals.length - 3}</Badge>
                        )}
                        {approvals.length === 0 && <span className="text-muted-foreground">—</span>}
                      </span>
                    </Td>
                    <Td className="text-center">
                      <Link
                        href={`/admin/courses?university=${u.id}`}
                        className="font-bold tabular-nums text-primary-600 hover:underline"
                      >
                        {u._count.courses}
                      </Link>
                    </Td>
                    <Td className="text-center tabular-nums text-muted-foreground">
                      {formatCount(u.students)}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Stars rating={u.rating} count={u.reviews} size={12} />
                    </Td>
                    <Td>
                      <span className="flex justify-end">
                        <Link
                          href={`/universities/${u.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`View ${u.name} on the site`}
                          title="View on site"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </span>
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
