import type { Metadata } from 'next'
import Link from 'next/link'
import {
  GraduationCap, CalendarDays, BookOpen, Award, TrendingUp, AlertCircle,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { Card, SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressRing } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { UniversityMark } from '@/components/course/course-thumb'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Academics' }

/** Weighted by credits — an unweighted mean would flatter a student who did
 *  well in 2-credit subjects and poorly in 6-credit ones. */
function gpa(rows: { credits: number; gradePoints: number | null }[]) {
  const graded = rows.filter((r) => r.gradePoints != null)
  const credits = graded.reduce((s, r) => s + r.credits, 0)
  if (!credits) return null
  const points = graded.reduce((s, r) => s + r.credits * (r.gradePoints ?? 0), 0)
  return points / credits
}

const gradeTone = (g: string | null) =>
  g === 'F' ? 'danger' : g === 'O' || g === 'A+' ? 'success' : g ? 'primary' : 'default'

export default async function AcademicsPage() {
  const user = await requireUser('/dashboard/academics')

  const enrolments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { enrolledAt: 'desc' },
    include: {
      batch: {
        include: {
          events: { where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 4 },
        },
      },
      course: {
        include: {
          university: { select: { name: true } },
          terms: {
            orderBy: { number: 'asc' },
            include: { subjects: { orderBy: { code: 'asc' } } },
          },
        },
      },
    },
  })

  const results = await prisma.subjectResult.findMany({ where: { userId: user.id } })
  const resultBySubject = new Map(results.map((r) => [r.subjectId, r]))

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Academic record"
        title="My Academics"
        sub="Your programme structure, credits, results and exam calendar."
      />

      {enrolments.length === 0 && (
        <Card className="p-10 text-center">
          <GraduationCap className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-bold">You&apos;re not enrolled in a programme yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Once you enrol, your semesters, subjects, credits and results appear here.
          </p>
          <Link href="/courses" className={buttonVariants({ className: 'mt-5' })}>
            Browse programmes
          </Link>
        </Card>
      )}

      {enrolments.map((e) => {
        const subjects = e.course.terms.flatMap((t) => t.subjects)
        const scored = subjects
          .map((s) => ({ credits: s.credits, gradePoints: resultBySubject.get(s.id)?.gradePoints ?? null }))
          .filter((r) => r.gradePoints != null)

        const creditsEarned = subjects
          .filter((s) => resultBySubject.get(s.id)?.status === 'PASS')
          .reduce((sum, s) => sum + s.credits, 0)
        const creditsTotal = subjects.reduce((sum, s) => sum + s.credits, 0)
        const cgpa = gpa(scored)

        return (
          <Card key={e.id} holo className="overflow-hidden">
            {/* ---------------------------------------------- programme head */}
            <div className="flex flex-wrap items-start gap-4 border-b border-border p-5">
              <UniversityMark name={e.course.university.name} size={44} />
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-extrabold leading-snug">{e.course.title}</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{e.course.university.name}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {e.batch && <Badge tone="primary">Batch {e.batch.name}</Badge>}
                  <Badge tone={e.status === 'COMPLETED' ? 'success' : 'default'}>{e.status}</Badge>
                  <Badge tone="default">{e.course.terms.length} semesters</Badge>
                  <Badge tone="default">{creditsTotal} credits</Badge>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-center">
                  <ProgressRing value={creditsTotal ? (creditsEarned / creditsTotal) * 100 : 0} size={64} />
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Credits
                  </p>
                  <p className="text-[11px] font-bold">
                    {creditsEarned} / {creditsTotal}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl font-extrabold text-primary-600 dark:text-primary-300">
                    {cgpa ? cgpa.toFixed(2) : '—'}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    CGPA
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {scored.length ? `${scored.length} graded` : 'no results yet'}
                  </p>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------- semesters */}
            <div className="divide-y divide-border">
              {e.course.terms.length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">
                  The syllabus breakdown for this programme hasn&apos;t been published yet.
                </p>
              )}

              {e.course.terms.map((term) => {
                const rows = term.subjects.map((s) => ({
                  subject: s,
                  result: resultBySubject.get(s.id) ?? null,
                }))
                const done = rows.filter((r) => r.result?.status === 'PASS').length
                const sgpa = gpa(
                  rows.map((r) => ({ credits: r.subject.credits, gradePoints: r.result?.gradePoints ?? null })),
                )

                return (
                  // Native details — accessible and collapsible with no JS.
                  <details key={term.id} className="group" open={done > 0 && done < rows.length}>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-5 marker:hidden hover:bg-muted/40">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-[13px] font-extrabold text-primary-700 dark:bg-primary-500/15 dark:text-primary-200">
                        {term.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-bold">{term.title}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {rows.length} subjects · {term.creditsRequired} credits required
                        </span>
                      </span>
                      {sgpa != null && (
                        <Badge tone="primary">SGPA {sgpa.toFixed(2)}</Badge>
                      )}
                      <span className="w-24">
                        <Progress value={rows.length ? (done / rows.length) * 100 : 0} />
                      </span>
                    </summary>

                    <div className="overflow-x-auto px-5 pb-5">
                      <table className="w-full min-w-[560px] text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th className="py-2 font-semibold">Code</th>
                            <th className="py-2 font-semibold">Subject</th>
                            <th className="py-2 text-center font-semibold">Credits</th>
                            <th className="py-2 text-center font-semibold">Int / Ext</th>
                            <th className="py-2 text-center font-semibold">Total</th>
                            <th className="py-2 text-right font-semibold">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rows.map(({ subject, result }) => (
                            <tr key={subject.id}>
                              <td className="py-2.5 font-mono text-[11px] text-muted-foreground">
                                {subject.code}
                              </td>
                              <td className="py-2.5 font-medium">
                                {subject.title}
                                {subject.kind !== 'CORE' && (
                                  <Badge tone="violet" className="ml-2">{subject.kind}</Badge>
                                )}
                              </td>
                              <td className="py-2.5 text-center">{subject.credits}</td>
                              <td className="py-2.5 text-center text-muted-foreground">
                                {result
                                  ? `${result.internalScore} / ${result.externalScore}`
                                  : `${subject.internalMarks} + ${subject.externalMarks}`}
                              </td>
                              <td className="py-2.5 text-center font-semibold">
                                {result ? result.totalScore : '—'}
                              </td>
                              <td className="py-2.5 text-right">
                                {result?.grade ? (
                                  <Badge tone={gradeTone(result.grade)}>{result.grade}</Badge>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">Awaited</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )
              })}
            </div>

            {/* --------------------------------------------------- calendar */}
            {e.batch && e.batch.events.length > 0 && (
              <div className="border-t border-border bg-muted/30 p-5">
                <p className="mb-3 flex items-center gap-2 text-[13px] font-bold">
                  <CalendarDays className="h-4 w-4 text-primary-600" />
                  Upcoming
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {e.batch.events.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                        {ev.type === 'EXAM' ? (
                          <Award className="h-4 w-4" />
                        ) : ev.type === 'FEE_DUE' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <BookOpen className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{ev.title}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatDate(ev.startsAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border p-5">
              <Link
                href={`/dashboard/learn/${e.courseId}`}
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Continue learning
              </Link>
              <Link
                href="/dashboard/materials"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Study material
              </Link>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
