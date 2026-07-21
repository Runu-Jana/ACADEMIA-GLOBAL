import type { Metadata } from 'next'
import Link from 'next/link'
import { Video, Radio, CalendarClock, PlayCircle, Users, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { Card, SectionTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Live Classes' }
// Timings drive what renders, so this page must never be cached.
export const dynamic = 'force-dynamic'

const EARLY_MS = 15 * 60_000

function when(d: Date) {
  return d.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function countdown(ms: number) {
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `in ${mins} min`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `in ${hrs} hr${hrs > 1 ? 's' : ''}`
  return `in ${Math.round(hrs / 24)} day${Math.round(hrs / 24) > 1 ? 's' : ''}`
}

export default async function LiveClassesPage() {
  const user = await requireUser('/dashboard/live')

  const enrolments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  })
  const courseIds = enrolments.map((e) => e.courseId)

  const classes = courseIds.length
    ? await prisma.liveClass.findMany({
        where: { courseId: { in: courseIds }, status: { not: 'CANCELLED' } },
        orderBy: { startsAt: 'asc' },
        include: {
          course: { select: { id: true, title: true } },
          subject: { select: { title: true } },
          attendance: { where: { userId: user.id }, select: { id: true } },
        },
      })
    : []

  const now = Date.now()
  const isLive = (c: (typeof classes)[number]) =>
    now >= c.startsAt.getTime() - EARLY_MS &&
    now <= c.startsAt.getTime() + c.durationMin * 60_000

  const live = classes.filter(isLive)
  const upcoming = classes.filter((c) => c.startsAt.getTime() - EARLY_MS > now)
  const past = classes
    .filter((c) => !isLive(c) && c.startsAt.getTime() < now)
    .reverse()

  const attended = classes.filter((c) => c.attendance.length > 0).length
  const held = classes.length - upcoming.length

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Classroom"
        title="Live Classes"
        sub="Join scheduled sessions, and catch up on anything you missed."
        action={
          held > 0 ? (
            <Badge tone={attended / held >= 0.75 ? 'success' : 'warning'}>
              <Users className="h-3 w-3" />
              Attendance {Math.round((attended / held) * 100)}%
            </Badge>
          ) : undefined
        }
      />

      {classes.length === 0 && (
        <Card className="p-10 text-center">
          <Video className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-bold">No live classes scheduled</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Sessions for your programmes will appear here as they&apos;re scheduled.
          </p>
          <Link href="/dashboard/learn" className={buttonVariants({ className: 'mt-5' })}>
            Back to my courses
          </Link>
        </Card>
      )}

      {/* --------------------------------------------------------- live now */}
      {live.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold">
            <span className="relative flex h-2.5 w-2.5">
              {/* The one animation on this page that earns its keep — it means
                  "happening right now", not decoration. */}
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Live now
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {live.map((c) => (
              <Card key={c.id} holo className="border-red-200 p-5 dark:border-red-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge tone="danger" className="mb-2">
                      <Radio className="h-3 w-3" />
                      LIVE
                    </Badge>
                    <h3 className="text-[15px] font-bold leading-snug">{c.title}</h3>
                    <p className="mt-1 truncate text-[12px] text-muted-foreground">
                      {c.course.title}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {when(c.startsAt)} · {c.durationMin} min
                  </span>
                </div>
                <a
                  href={`/api/live/${c.id}/join`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'holo', className: 'mt-4 w-full' })}
                >
                  <Video className="h-4 w-4" />
                  Join class
                </a>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold">
            <CalendarClock className="h-4 w-4 text-primary-600" />
            Upcoming
          </h2>
          <Card className="divide-y divide-border">
            {upcoming.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                  <Video className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">{c.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {c.course.title} · {when(c.startsAt)}
                  </p>
                </div>
                <Badge tone="default">{countdown(c.startsAt.getTime() - now)}</Badge>
                {/* Deliberately not a link — the route rejects early joins with
                    a 425, so offering the button would just produce an error. */}
                <span className="text-[11px] text-muted-foreground">
                  Opens 15 min before
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* ------------------------------------------------------------ past */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold">
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
            Past classes
          </h2>
          <Card className="divide-y divide-border">
            {past.map((c) => {
              const wasThere = c.attendance.length > 0
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                      wasThere
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <PlayCircle className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{c.title}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {c.course.title} · {when(c.startsAt)}
                    </p>
                  </div>
                  <Badge tone={wasThere ? 'success' : 'default'}>
                    {wasThere ? 'Attended' : 'Missed'}
                  </Badge>
                  {c.recordingUrl ? (
                    <a
                      href={c.recordingUrl}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Recording
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Recording pending</span>
                  )}
                </div>
              )
            })}
          </Card>
        </section>
      )}
    </div>
  )
}
