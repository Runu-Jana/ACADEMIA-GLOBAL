import Link from 'next/link'
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  FolderUp,
  FileClock,
  Upload,
  Plus,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { Progress } from '@/components/ui/progress'
import {
  PageHeader,
  StatTile,
  TableWrap,
  DataTable,
  Thead,
  Tbody,
  Th,
  Td,
  TableEmpty,
  MaterialTypeBadge,
  EnrollmentStatusBadge,
} from '@/components/admin/admin-ui'
import { formatBytes, formatDate, initials } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [
    students,
    activeEnrolments,
    courses,
    universities,
    materials,
    pendingApplications,
    recentEnrolments,
    recentUploads,
    topCourses,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
    prisma.course.count(),
    prisma.university.count(),
    prisma.material.count(),
    prisma.application.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    prisma.enrollment.findMany({
      orderBy: { enrolledAt: 'desc' },
      take: 6,
      select: {
        id: true,
        status: true,
        progressPct: true,
        enrolledAt: true,
        user: { select: { id: true, name: true, email: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
    prisma.material.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        type: true,
        fileSize: true,
        createdAt: true,
        course: { select: { title: true } },
      },
    }),
    prisma.course.findMany({
      orderBy: { enrollments: { _count: 'desc' } },
      take: 7,
      select: {
        id: true,
        title: true,
        stream: true,
        _count: { select: { enrollments: true } },
      },
    }),
  ])

  const maxEnrol = Math.max(1, ...topCourses.map((c) => c._count.enrollments))

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub="Everything happening across the platform at a glance."
        actions={
          <>
            <Link
              href="/admin/materials"
              className={buttonVariants({ variant: 'holo', size: 'sm' })}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Material
            </Link>
            <Link
              href="/admin/courses/new"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Course
            </Link>
          </>
        }
      />

      {/* ------------------------------------------------------- stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total Students', value: students, icon: Users, tone: 'primary' as const, href: '/admin/students' },
          { label: 'Active Enrolments', value: activeEnrolments, icon: GraduationCap, tone: 'cyan' as const, href: '/admin/enrolments' },
          { label: 'Courses', value: courses, icon: BookOpen, tone: 'violet' as const, href: '/admin/courses' },
          { label: 'Universities', value: universities, icon: Building2, tone: 'green' as const, href: '/admin/universities' },
          { label: 'Materials Uploaded', value: materials, icon: FolderUp, tone: 'orange' as const, href: '/admin/materials' },
          { label: 'Applications Pending', value: pendingApplications, icon: FileClock, tone: 'amber' as const, href: '/admin/applications?status=SUBMITTED' },
        ].map((tile, i) => (
          <Reveal key={tile.label} delay={i * 50} className="h-full">
            <StatTile {...tile} delay={i * 40} />
          </Reveal>
        ))}
      </div>

      {/* ------------------------------------------- enrolments + breakdown */}
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Reveal delay={60}>
          <section className="card-base overflow-hidden" aria-labelledby="recent-enrolments">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <h3 id="recent-enrolments" className="text-[15px] font-bold">
                Recent Enrolments
              </h3>
              <Link
                href="/admin/enrolments"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-primary-600 hover:underline"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <TableWrap>
              <DataTable>
                <Thead>
                  <Th>Student</Th>
                  <Th>Course</Th>
                  <Th className="w-40">Progress</Th>
                  <Th>Status</Th>
                  <Th>Enrolled</Th>
                </Thead>
                <Tbody>
                  {recentEnrolments.length === 0 && (
                    <TableEmpty colSpan={5}>No enrolments yet.</TableEmpty>
                  )}
                  {recentEnrolments.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-muted/40">
                      <Td>
                        <Link
                          href={`/admin/students/${e.user.id}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-fade text-[10px] font-bold text-white">
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
                        <span className="line-clamp-2 font-medium">{e.course.title}</span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Progress value={e.progressPct} className="h-1.5 w-20" />
                          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                            {e.progressPct}%
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <EnrollmentStatusBadge status={e.status} />
                      </Td>
                      <Td className="whitespace-nowrap text-muted-foreground">
                        {formatDate(e.enrolledAt)}
                      </Td>
                    </tr>
                  ))}
                </Tbody>
              </DataTable>
            </TableWrap>
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className="card-base h-full p-4" aria-labelledby="enrol-breakdown">
            <h3 id="enrol-breakdown" className="text-[15px] font-bold">
              Enrolments per Course
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Top {topCourses.length} programmes by total enrolment.
            </p>

            <ul className="mt-4 space-y-3">
              {topCourses.map((c) => {
                const n = c._count.enrollments
                const width = Math.max(2, Math.round((n / maxEnrol) * 100))
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[12.5px] font-semibold">{c.title}</span>
                      <span className="shrink-0 text-[12px] font-bold tabular-nums text-primary-600 dark:text-primary-300">
                        {n}
                      </span>
                    </div>
                    {/* Plain divs — no chart library in this project. */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-holo-sweep transition-[width] duration-700 ease-spring"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                )
              })}
              {topCourses.length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">No courses yet.</li>
              )}
            </ul>
          </section>
        </Reveal>
      </div>

      {/* ------------------------------------------------------ recent uploads */}
      <Reveal delay={80} className="mt-4 block">
        <section className="card-base p-4" aria-labelledby="recent-uploads">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="recent-uploads" className="text-[15px] font-bold">
              Recent Uploads
            </h3>
            <Link
              href="/admin/materials"
              className="inline-flex items-center gap-1 text-[12px] font-bold text-primary-600 hover:underline"
            >
              Manage material
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentUploads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
              <Link
                href="/admin/materials"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-3' })}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload the first file
              </Link>
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {recentUploads.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-all duration-300 hover:border-primary-200 hover:shadow-soft dark:hover:border-primary-500/40"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{m.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.course.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <MaterialTypeBadge type={m.type} />
                      <span className="text-[11px] text-muted-foreground">
                        {formatBytes(m.fileSize)} · {formatDate(m.createdAt)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>
    </>
  )
}
