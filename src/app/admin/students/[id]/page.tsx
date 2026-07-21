import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Award,
  ClipboardList,
  FileCheck2,
  GraduationCap,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Reveal } from '@/components/fx/reveal'
import { StatusBadge, EnrollmentStatusBadge } from '@/components/admin/admin-ui'
import { formatDate, initials, pct } from '@/lib/utils'

export const metadata: Metadata = { title: 'Student' }
export const dynamic = 'force-dynamic'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const student = await prisma.user.findFirst({
    where: { id, role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      dob: true,
      gender: true,
      createdAt: true,
      enrollments: {
        orderBy: { enrolledAt: 'desc' },
        select: {
          id: true,
          status: true,
          progressPct: true,
          enrolledAt: true,
          completedAt: true,
          course: { select: { id: true, title: true, slug: true, university: { select: { shortName: true } } } },
        },
      },
      testAttempts: {
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          score: true,
          totalMarks: true,
          passed: true,
          submittedAt: true,
          test: { select: { title: true, module: { select: { title: true } } } },
        },
      },
      certificates: {
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          serial: true,
          grade: true,
          issuedAt: true,
          course: { select: { title: true } },
        },
      },
      applications: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          status: true,
          step: true,
          updatedAt: true,
          course: { select: { title: true } },
        },
      },
    },
  })

  if (!student) notFound()

  return (
    <>
      <Link
        href="/admin/students"
        className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to students
      </Link>

      {/* ------------------------------------------------------------ header */}
      <div className="card-base holo-ring mb-4 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-fade text-xl font-extrabold text-white">
          {initials(student.name)}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            {student.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              <span className="break-all">{student.email}</span>
            </span>
            {student.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {student.phone}
              </span>
            )}
            {student.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {student.city}
                {student.state ? `, ${student.state}` : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Joined {formatDate(student.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Badge tone="primary">{student.enrollments.length} enrolments</Badge>
          <Badge tone="success">{student.certificates.length} certificates</Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ------------------------------------------------------ enrolments */}
        <Reveal>
          <Panel title="Enrolments" icon={GraduationCap} count={student.enrollments.length}>
            {student.enrollments.length === 0 ? (
              <Empty>Not enrolled in any course yet.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {student.enrollments.map((e) => (
                  <li key={e.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/courses/${e.course.id}`}
                          className="block truncate text-[13.5px] font-bold transition-colors hover:text-primary-600"
                        >
                          {e.course.title}
                        </Link>
                        <p className="truncate text-[11.5px] text-muted-foreground">
                          {e.course.university.shortName} · enrolled {formatDate(e.enrolledAt)}
                        </p>
                      </div>
                      <EnrollmentStatusBadge status={e.status} />
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <Progress value={e.progressPct} holo className="h-2 flex-1" />
                      <span className="shrink-0 text-[11.5px] font-bold tabular-nums">
                        {e.progressPct}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Reveal>

        {/* ---------------------------------------------------- test attempts */}
        <Reveal delay={60}>
          <Panel title="Test Attempts" icon={ClipboardList} count={student.testAttempts.length}>
            {student.testAttempts.length === 0 ? (
              <Empty>No tests attempted yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {student.testAttempts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">{a.test.title}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {a.test.module.title} · {formatDate(a.submittedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-extrabold tabular-nums">
                        {a.score}/{a.totalMarks}
                      </span>
                      <span className="block text-[11px] tabular-nums text-muted-foreground">
                        {pct(a.score, a.totalMarks)}%
                      </span>
                    </span>
                    <Badge tone={a.passed ? 'success' : 'danger'} className="shrink-0">
                      {a.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Reveal>

        {/* ----------------------------------------------------- certificates */}
        <Reveal delay={120}>
          <Panel title="Certificates" icon={Award} count={student.certificates.length}>
            {student.certificates.length === 0 ? (
              <Empty>No certificates issued yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {student.certificates.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold">{c.course.title}</p>
                        <p className="truncate font-mono text-[11.5px] text-muted-foreground">
                          {c.serial}
                        </p>
                      </div>
                      <Badge tone="holo" className="shrink-0">
                        Grade {c.grade}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11.5px] text-muted-foreground">
                        Issued {formatDate(c.issuedAt)}
                      </span>
                      <Link
                        href={`/verify?serial=${encodeURIComponent(c.serial)}`}
                        className="text-[11.5px] font-bold text-primary-600 hover:underline"
                      >
                        Verify
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Reveal>

        {/* ----------------------------------------------------- applications */}
        <Reveal delay={180}>
          <Panel title="Applications" icon={FileCheck2} count={student.applications.length}>
            {student.applications.length === 0 ? (
              <Empty>No admission applications yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {student.applications.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">{a.course.title}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        Step {a.step} of 4 · updated {formatDate(a.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Reveal>
      </div>
    </>
  )
}

function Panel({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string
  icon: React.ElementType
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="card-base h-full p-4" aria-label={title}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-[15px] font-bold">{title}</h3>
        <span className="ml-auto text-[12px] font-bold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
      {children}
    </p>
  )
}
