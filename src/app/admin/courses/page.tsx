import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Courses' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key]
  return typeof v === 'string' ? v : ''
}

export default async function AdminCoursesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()

  const sp = await searchParams
  const values = {
    q: one(sp, 'q'),
    level: one(sp, 'level'),
    mode: one(sp, 'mode'),
    stream: one(sp, 'stream'),
    university: one(sp, 'university'),
  }

  const where: Prisma.CourseWhereInput = {
    ...(values.q && {
      OR: [
        { title: { contains: values.q, mode: 'insensitive' } },
        { slug: { contains: values.q, mode: 'insensitive' } },
        { subtitle: { contains: values.q, mode: 'insensitive' } },
      ],
    }),
    ...(values.level && { level: values.level }),
    ...(values.mode && { mode: values.mode }),
    ...(values.stream && { stream: values.stream }),
    ...(values.university && { universityId: values.university }),
  }

  const [courses, universities, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        level: true,
        mode: true,
        stream: true,
        feePerYear: true,
        durationYears: true,
        featured: true,
        university: { select: { name: true, shortName: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
    }),
    prisma.university.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.course.count(),
  ])

  return (
    <>
      <PageHeader
        title="Courses"
        sub={`${courses.length} of ${total} programme${total === 1 ? '' : 's'}`}
        actions={
          <Link href="/admin/courses/new" className={buttonVariants({ variant: 'holo', size: 'sm' })}>
            <Plus className="h-3.5 w-3.5" />
            Create Course
          </Link>
        }
      />

      <FilterBar
        basePath="/admin/courses"
        values={values}
        searchPlaceholder="Search by title, slug or subtitle…"
        selects={[
          { name: 'level', label: 'All levels', options: COURSE_LEVELS.map((l) => ({ ...l })) },
          { name: 'mode', label: 'All modes', options: COURSE_MODES.map((m) => ({ ...m })) },
          { name: 'stream', label: 'All streams', options: STREAMS.map((s) => ({ ...s })) },
          {
            name: 'university',
            label: 'All universities',
            options: universities.map((u) => ({ value: u.id, label: u.name })),
          },
        ]}
      />

      <div className="card-base overflow-hidden">
        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Course</Th>
              <Th>University</Th>
              <Th>Level</Th>
              <Th>Mode</Th>
              <Th>Fee / year</Th>
              <Th className="text-center">Enrolments</Th>
              <Th className="text-center">Modules</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {courses.length === 0 && (
                <TableEmpty colSpan={8}>
                  No courses match those filters.{' '}
                  <Link href="/admin/courses" className="font-semibold text-primary-600 hover:underline">
                    Reset
                  </Link>
                </TableEmpty>
              )}

              {courses.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[19rem]">
                    <Link href={`/admin/courses/${c.id}`} className="group block min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold transition-colors group-hover:text-primary-600">
                          {c.title}
                        </span>
                        {c.featured && (
                          <Badge tone="holo" className="shrink-0">
                            Featured
                          </Badge>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        /{c.slug} · {c.durationYears} yr
                      </span>
                    </Link>
                  </Td>
                  <Td className="max-w-[12rem]">
                    <span className="flex items-center gap-2">
                      <UniversityMark name={c.university.name} size={22} />
                      <span className="truncate text-[12.5px]">{c.university.shortName}</span>
                    </span>
                  </Td>
                  <Td>
                    <Badge tone="primary">{c.level}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {COURSE_MODES.find((m) => m.value === c.mode)?.label ?? c.mode}
                  </Td>
                  <Td className="whitespace-nowrap font-semibold tabular-nums">
                    {formatINR(c.feePerYear)}
                  </Td>
                  <Td className="text-center font-bold tabular-nums">{c._count.enrollments}</Td>
                  <Td className="text-center tabular-nums text-muted-foreground">
                    {c._count.modules}
                  </Td>
                  <Td>
                    <span className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/courses/${c.id}`}
                        aria-label={`Edit ${c.title}`}
                        title="Edit course"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/courses/${c.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${c.title} on the site`}
                        title="View on site"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
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
