import Link from 'next/link'
import {
  BookOpen, PenSquare, ClipboardList, ArrowRight, Play, Radio, CalendarDays,
  Download, Sparkles, GraduationCap,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressRing } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { CourseThumb } from '@/components/course/course-thumb'
import {
  StatTile, EmptyState, PanelHeading, MaterialIcon, materialLabel,
} from '@/components/dashboard/primitives'
import { EngagementSummary } from '@/components/dashboard/engagement'
import { getEngagement } from '@/lib/gamification'
import { cn, formatBytes, formatDate } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

/** Deterministic "n days from now" used to lay out the indicative timetable. */
function at(days: number, hour: number, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

type UpcomingItem = {
  key: string
  kind: 'LIVE' | 'TEST' | 'ASSIGNMENT'
  title: string
  course: string
  href: string
  when: Date
}

const UPCOMING_STYLE: Record<UpcomingItem['kind'], { label: string; icon: React.ElementType; tone: string }> = {
  LIVE: { label: 'Live Class', icon: Radio, tone: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300' },
  TEST: { label: 'Exam', icon: ClipboardList, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  ASSIGNMENT: { label: 'Assignment Due', icon: PenSquare, tone: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
}

export default async function DashboardPage() {
  const user = await requireUser('/dashboard')
  const firstName = user.name.split(' ')[0] || user.name

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    orderBy: [{ status: 'asc' }, { enrolledAt: 'desc' }],
    select: {
      id: true,
      status: true,
      progressPct: true,
      enrolledAt: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          stream: true,
          level: true,
          university: { select: { name: true, shortName: true } },
          modules: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              lessons: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, type: true, durationMin: true },
              },
              tests: { select: { id: true, title: true, type: true, durationMin: true } },
            },
          },
        },
      },
    },
  })

  const courseIds = enrollments.map((e) => e.course.id)

  const [progressRows, attempts, recentMaterial, assignments, engagement] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: user.id, lesson: { module: { courseId: { in: courseIds } } } },
      select: { lessonId: true },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id },
      select: { testId: true },
    }),
    prisma.material.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, title: true, type: true, fileUrl: true, fileName: true,
        fileSize: true, createdAt: true,
        course: { select: { title: true } },
      },
    }),
    prisma.material.findMany({
      where: { courseId: { in: courseIds }, type: 'ASSIGNMENT' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, course: { select: { title: true } } },
    }),
    getEngagement(user.id),
  ])

  const assignmentCount = await prisma.material.count({
    where: { courseId: { in: courseIds }, type: 'ASSIGNMENT' },
  })

  const done = new Set(progressRows.map((p) => p.lessonId))
  const attempted = new Set(attempts.map((a) => a.testId))

  const allTests = enrollments.flatMap((e) => e.course.modules.flatMap((m) => m.tests))
  const overall = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + e.progressPct, 0) / enrollments.length)
    : 0

  /* ------------------------------------------------- continue learning */
  const continueCards = enrollments.map((e) => {
    const lessons = e.course.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, moduleTitle: m.title })),
    )
    const next = lessons.find((l) => !done.has(l.id)) ?? null
    const completed = lessons.filter((l) => done.has(l.id)).length
    return { enrollment: e, next, completed, total: lessons.length }
  })

  /* -------------------------------------------------------- upcoming */
  const upcoming: UpcomingItem[] = []
  let liveSlot = 1
  let testSlot = 4
  let assignmentSlot = 3

  for (const e of enrollments) {
    if (e.status === 'COMPLETED') continue

    const liveLessons = e.course.modules
      .flatMap((m) => m.lessons)
      .filter((l) => l.type === 'LIVE' && !done.has(l.id))
      .slice(0, 2)

    for (const l of liveLessons) {
      upcoming.push({
        key: `live-${l.id}`,
        kind: 'LIVE',
        title: l.title,
        course: e.course.title,
        href: `/dashboard/learn/${e.course.id}?lesson=${l.id}`,
        when: at(liveSlot, 18, 30),
      })
      liveSlot += 2
    }

    const nextTest = e.course.modules.flatMap((m) => m.tests).find((t) => !attempted.has(t.id))
    if (nextTest) {
      upcoming.push({
        key: `test-${nextTest.id}`,
        kind: 'TEST',
        title: nextTest.title,
        course: e.course.title,
        href: `/dashboard/tests/${nextTest.id}`,
        when: at(testSlot, 11, 0),
      })
      testSlot += 3
    }
  }

  for (const a of assignments) {
    upcoming.push({
      key: `assignment-${a.id}`,
      kind: 'ASSIGNMENT',
      title: a.title,
      course: a.course.title,
      href: '/dashboard/assignments',
      when: at(assignmentSlot, 23, 59),
    })
    assignmentSlot += 4
  }

  upcoming.sort((a, b) => a.when.getTime() - b.when.getTime())
  const upcomingTop = upcoming.slice(0, 5)

  /* ------------------------------------------------------------ empty */
  if (!enrollments.length) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Greeting firstName={firstName} sub="Let's get your learning journey started." />
        <Reveal>
          <EmptyState
            icon={GraduationCap}
            title="You haven't enrolled in a course yet"
            body="Browse UGC-entitled online, distance and regular programs from India's top universities. Your lessons, study material, tests and certificates all live here once you enrol."
            actionHref="/courses"
            actionLabel="Explore Courses"
          />
        </Reveal>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <Greeting
        firstName={firstName}
        sub={`You have ${enrollments.filter((e) => e.status === 'ACTIVE').length} active course${
          enrollments.filter((e) => e.status === 'ACTIVE').length === 1 ? '' : 's'
        }. Keep going — consistency beats intensity.`}
      />

      {/* ------------------------------------------------ momentum strip */}
      <Reveal>
        <EngagementSummary engagement={engagement} />
      </Reveal>

      {/* --------------------------------------------------- stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal>
          <StatTile
            label="My Courses"
            value={enrollments.length}
            sub={`${enrollments.filter((e) => e.status === 'COMPLETED').length} completed`}
            icon={BookOpen}
            tone="primary"
            href="/dashboard/learn"
          />
        </Reveal>
        <Reveal delay={70}>
          <StatTile
            label="Assignments"
            value={assignmentCount}
            sub="Across your enrolled courses"
            icon={PenSquare}
            tone="orange"
            href="/dashboard/assignments"
          />
        </Reveal>
        <Reveal delay={140}>
          <StatTile
            label="Tests & Exams"
            value={allTests.length}
            sub={`${attempted.size} attempted`}
            icon={ClipboardList}
            tone="violet"
            href="/dashboard/tests"
          />
        </Reveal>
        <Reveal delay={210}>
          <StatTile
            label="Overall Progress"
            sub="Average across all courses"
            visual={<ProgressRing value={overall} size={56} stroke={6} />}
            tone="emerald"
          />
        </Reveal>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* ------------------------------------------ continue learning */}
        <section aria-labelledby="continue-heading">
          <PanelHeading
            title="Continue Learning"
            sub="Pick up exactly where you left off."
            action={
              <Link href="/dashboard/learn" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                All Courses
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <h2 id="continue-heading" className="sr-only">Continue learning</h2>

          <ul className="space-y-4">
            {continueCards.map(({ enrollment: e, next, completed, total }, i) => (
              <li key={e.id}>
                <Reveal delay={i * 60}>
                  <TiltCard className="group h-full" intensity={4} scale={1.005}>
                    <article className="card-base holo-ring-hover overflow-hidden">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-4.5">
                        <CourseThumb
                          stream={e.course.stream}
                          title={e.course.title}
                          compact
                          className="h-20 w-full shrink-0 rounded-xl sm:h-16 sm:w-24"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={e.status === 'COMPLETED' ? 'success' : 'primary'}>
                              {e.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                            </Badge>
                            <span className="truncate text-[11px] font-semibold text-muted-foreground">
                              {e.course.university.shortName}
                            </span>
                          </div>

                          <h3 className="mt-1.5 line-clamp-1 text-[15px] font-bold">{e.course.title}</h3>

                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {next ? `Next: ${next.title}` : 'All lessons complete — well done!'}
                          </p>

                          <div className="mt-3 flex items-center gap-3">
                            <Progress value={e.progressPct} holo className="h-1.5 flex-1" />
                            <span className="shrink-0 text-[11px] font-bold tabular-nums text-primary-700 dark:text-primary-300">
                              {e.progressPct}%
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {completed} of {total} lessons complete
                          </p>
                        </div>

                        <Link
                          href={
                            next
                              ? `/dashboard/learn/${e.course.id}?lesson=${next.id}`
                              : `/dashboard/learn/${e.course.id}`
                          }
                          className={buttonVariants({
                            variant: next ? 'primary' : 'outline',
                            size: 'sm',
                            className: 'w-full shrink-0 sm:w-auto',
                          })}
                        >
                          <Play className="h-3.5 w-3.5" />
                          {next ? 'Continue' : 'Review'}
                        </Link>
                      </div>
                    </article>
                  </TiltCard>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------- upcoming */}
        <aside aria-labelledby="upcoming-heading">
          <PanelHeading title="Upcoming" sub="Live classes, assignments and exams." />
          <h2 id="upcoming-heading" className="sr-only">Upcoming</h2>

          {upcomingTop.length ? (
            <Reveal>
              <div className="card-base holo-ring overflow-hidden">
                <ul className="divide-y divide-border">
                  {upcomingTop.map((item) => {
                    const style = UPCOMING_STYLE[item.kind]
                    const Icon = style.icon
                    return (
                      <li key={item.key}>
                        <Link href={item.href} className="flex gap-3 p-3.5 transition-colors hover:bg-muted/50">
                          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', style.tone)}>
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {style.label}
                            </span>
                            <p className="line-clamp-1 text-[13px] font-bold">{item.title}</p>
                            <p className="line-clamp-1 text-[11px] text-muted-foreground">{item.course}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary-700 dark:text-primary-300">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(item.when)} · {timeLabel(item.when)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                <p className="border-t border-border bg-muted/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Indicative schedule generated from your course plan — confirm exact timings with your faculty.
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="card-base p-6 text-center text-sm text-muted-foreground">
              Nothing scheduled right now.
            </div>
          )}
        </aside>
      </div>

      {/* ------------------------------------------- recent study material */}
      <section aria-labelledby="material-heading">
        <PanelHeading
          title="Recent Study Material"
          sub="The latest uploads from your courses."
          action={
            <Link href="/dashboard/materials" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <h2 id="material-heading" className="sr-only">Recent study material</h2>

        {recentMaterial.length ? (
          <Reveal>
            <div className="card-base overflow-hidden">
              <ul className="divide-y divide-border">
                {recentMaterial.map((m) => (
                  <li key={m.id} className="flex items-center gap-3.5 p-3.5 transition-colors hover:bg-muted/40">
                    <MaterialIcon type={m.type} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13.5px] font-bold">{m.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {materialLabel(m.type)} · {m.course.title}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[11px] font-semibold text-muted-foreground">{formatBytes(m.fileSize)}</p>
                      <p className="text-[11px] text-muted-foreground/80">{formatDate(m.createdAt)}</p>
                    </div>
                    <a
                      href={`/api/materials/${m.id}/download`}
                      download={m.fileName}
                      aria-label={`Download ${m.title}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm', className: 'shrink-0' })}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : (
          <div className="card-base p-6 text-center text-sm text-muted-foreground">
            No study material has been uploaded to your courses yet.
          </div>
        )}
      </section>
    </div>
  )
}

function Greeting({ firstName, sub }: { firstName: string; sub: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-holo-sweep opacity-20 blur-3xl"
      />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary-500" />
          {formatDate(new Date())}
        </span>
        <h2 className="mt-2.5 text-balance font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">
          Welcome back, <span className="holo-text">{firstName}</span>
        </h2>
        <p className="mt-1.5 max-w-xl text-pretty text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}
