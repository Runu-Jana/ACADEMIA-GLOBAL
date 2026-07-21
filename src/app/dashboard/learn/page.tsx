import Link from 'next/link'
import { Play, GraduationCap, Clock, BookOpen, Award } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { CourseThumb, UniversityMark } from '@/components/course/course-thumb'
import { EmptyState, PanelHeading } from '@/components/dashboard/primitives'
import { COURSE_LEVELS, COURSE_MODES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'My Courses' }

const STATUS_TONE: Record<string, 'primary' | 'success' | 'warning'> = {
  ACTIVE: 'primary',
  COMPLETED: 'success',
  PAUSED: 'warning',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'In Progress',
  COMPLETED: 'Completed',
  PAUSED: 'Paused',
}

export default async function MyCoursesPage() {
  const user = await requireUser('/dashboard/learn')

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    orderBy: [{ status: 'asc' }, { enrolledAt: 'desc' }],
    select: {
      id: true,
      status: true,
      progressPct: true,
      enrolledAt: true,
      certificate: { select: { serial: true } },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          stream: true,
          level: true,
          mode: true,
          durationYears: true,
          university: { select: { name: true, shortName: true } },
          modules: {
            select: {
              lessons: { select: { id: true, durationMin: true } },
            },
          },
        },
      },
    },
  })

  const courseIds = enrollments.map((e) => e.course.id)
  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId: user.id, lesson: { module: { courseId: { in: courseIds } } } },
    select: { lessonId: true },
  })
  const done = new Set(progressRows.map((p) => p.lessonId))

  if (!enrollments.length) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={GraduationCap}
          title="No courses yet"
          body="Once you enrol in a program it appears here with your lessons, progress and certificate. Browse the catalogue to find a program that fits."
          actionHref="/courses"
          actionLabel="Explore Courses"
        />
      </div>
    )
  }

  return (
    <div>
      <PanelHeading
        title="My Courses"
        sub={`${enrollments.length} enrolment${enrollments.length === 1 ? '' : 's'} · ${
          enrollments.filter((e) => e.status === 'COMPLETED').length
        } completed`}
        action={
          <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <BookOpen className="h-3.5 w-3.5" />
            Browse More
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {enrollments.map((e, i) => {
          const lessons = e.course.modules.flatMap((m) => m.lessons)
          const completed = lessons.filter((l) => done.has(l.id)).length
          const hours = Math.round(lessons.reduce((s, l) => s + l.durationMin, 0) / 60)
          const levelLabel = COURSE_LEVELS.find((l) => l.value === e.course.level)?.label ?? e.course.level
          const modeLabel = COURSE_MODES.find((m) => m.value === e.course.mode)?.label ?? e.course.mode

          return (
            <Reveal key={e.id} delay={i * 60}>
              <TiltCard className="group h-full" intensity={6} scale={1.012}>
                <article className="card-base holo-ring holo-ring-hover flex h-full flex-col overflow-hidden hover:shadow-lift">
                  <div className="relative">
                    <CourseThumb stream={e.course.stream} title={e.course.title} className="h-32" />
                    <Badge
                      tone={STATUS_TONE[e.status] ?? 'default'}
                      className="absolute left-3 top-3 shadow-sm"
                    >
                      {STATUS_LABEL[e.status] ?? e.status}
                    </Badge>
                    {e.certificate && (
                      <Badge tone="holo" className="absolute right-3 top-3 shadow-sm">
                        <Award className="h-3 w-3" />
                        Certified
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center gap-2">
                      <UniversityMark name={e.course.university.name} size={22} />
                      <span className="truncate text-[11px] font-semibold text-muted-foreground">
                        {e.course.university.name}
                      </span>
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug">
                      {e.course.title}
                    </h3>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="chip">{levelLabel}</span>
                      <span className="chip">{modeLabel}</span>
                      {hours > 0 && (
                        <span className="chip">
                          <Clock className="h-3 w-3" />
                          {hours}h
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-muted-foreground">
                          {completed} of {lessons.length} lessons
                        </span>
                        <span className="tabular-nums text-primary-700 dark:text-primary-300">
                          {e.progressPct}%
                        </span>
                      </div>
                      <Progress value={e.progressPct} holo className="h-1.5" />
                    </div>

                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Enrolled {formatDate(e.enrolledAt)}
                    </p>

                    <Link
                      href={`/dashboard/learn/${e.course.id}`}
                      className={buttonVariants({
                        variant: e.status === 'COMPLETED' ? 'outline' : 'primary',
                        size: 'sm',
                        className: 'mt-4 w-full',
                      })}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {e.progressPct === 0 ? 'Start Course' : e.status === 'COMPLETED' ? 'Review Course' : 'Continue'}
                    </Link>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
