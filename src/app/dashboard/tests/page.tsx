import Link from 'next/link'
import { ClipboardList, Trophy, Clock, ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { EmptyState, PanelHeading, StatTile } from '@/components/dashboard/primitives'

export const metadata = { title: 'Tests & Exams' }

const TYPE_LABEL: Record<string, string> = {
  QUIZ: 'Module Quiz',
  MID_TERM: 'Mid-Term Exam',
  FINAL: 'Final Exam',
}

export default async function TestsPage() {
  const user = await requireUser('/dashboard/tests')

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { enrolledAt: 'desc' },
    select: {
      id: true,
      course: {
        select: {
          id: true,
          title: true,
          university: { select: { shortName: true } },
          modules: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              tests: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  totalMarks: true,
                  passMarks: true,
                  durationMin: true,
                  _count: { select: { questions: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const attempts = await prisma.testAttempt.findMany({
    where: { userId: user.id },
    select: { testId: true, score: true, totalMarks: true, passed: true },
  })

  const bestByTest = new Map<string, { score: number; totalMarks: number; passed: boolean; count: number }>()
  for (const a of attempts) {
    const current = bestByTest.get(a.testId)
    if (!current) {
      bestByTest.set(a.testId, { score: a.score, totalMarks: a.totalMarks, passed: a.passed, count: 1 })
    } else {
      bestByTest.set(a.testId, {
        score: Math.max(current.score, a.score),
        totalMarks: a.totalMarks || current.totalMarks,
        passed: current.passed || a.passed,
        count: current.count + 1,
      })
    }
  }

  const courses = enrollments
    .map((e) => ({
      id: e.course.id,
      title: e.course.title,
      university: e.course.university.shortName,
      tests: e.course.modules.flatMap((m) =>
        m.tests.map((t) => ({ ...t, moduleTitle: m.title })),
      ),
    }))
    .filter((c) => c.tests.length > 0)

  const allTests = courses.flatMap((c) => c.tests)
  const attemptedCount = allTests.filter((t) => bestByTest.has(t.id)).length
  const passedCount = allTests.filter((t) => bestByTest.get(t.id)?.passed).length

  if (!allTests.length) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={ClipboardList}
          title="No tests available yet"
          body="Module quizzes and exams appear here as soon as you enrol in a course that has them."
          actionHref="/dashboard/learn"
          actionLabel="Go to My Courses"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal>
          <StatTile label="Total Tests" value={allTests.length} icon={ClipboardList} tone="violet" />
        </Reveal>
        <Reveal delay={70}>
          <StatTile label="Attempted" value={attemptedCount} icon={Clock} tone="primary" />
        </Reveal>
        <Reveal delay={140}>
          <StatTile label="Passed" value={passedCount} icon={Trophy} tone="emerald" />
        </Reveal>
      </div>

      {courses.map((course, ci) => (
        <section key={course.id} aria-labelledby={`tests-${course.id}`}>
          <PanelHeading
            title={course.title}
            sub={`${course.tests.length} test${course.tests.length === 1 ? '' : 's'} · ${course.university}`}
            action={
              <Link
                href={`/dashboard/learn/${course.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Open Course
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <h2 id={`tests-${course.id}`} className="sr-only">{course.title} tests</h2>

          <Reveal delay={ci * 50}>
            <div className="card-base overflow-hidden">
              <ul className="divide-y divide-border">
                {course.tests.map((t) => {
                  const best = bestByTest.get(t.id)
                  return (
                    <li
                      key={t.id}
                      className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                        <ClipboardList className="h-[18px] w-[18px]" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[14px] font-bold">{t.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">
                          {TYPE_LABEL[t.type] ?? t.type} · {t._count.questions} questions ·{' '}
                          {t.durationMin} min · pass {t.passMarks}/{t.totalMarks}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        {best ? (
                          <Badge tone={best.passed ? 'success' : 'warning'}>
                            <Trophy className="h-3 w-3" />
                            {best.score}/{best.totalMarks}
                            {best.count > 1 && ` · ${best.count} tries`}
                          </Badge>
                        ) : (
                          <Badge tone="default">Not attempted</Badge>
                        )}

                        <Link
                          href={`/dashboard/tests/${t.id}`}
                          className={buttonVariants({
                            variant: best ? 'outline' : 'primary',
                            size: 'sm',
                            className: 'shrink-0',
                          })}
                        >
                          {best ? 'Retake' : 'Start'}
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Reveal>
        </section>
      ))}
    </div>
  )
}
