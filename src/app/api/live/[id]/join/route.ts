import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { SITE_URL } from '@/lib/site-url'

/**
 * The only way into a live class.
 *
 * The room name is never rendered to the browser — a Jitsi room is public to
 * anyone who knows its name, so the name IS the credential on the video side.
 * This route checks enrolment, marks the register, then redirects. A student
 * who isn't enrolled never learns the room exists.
 */

/** Base for self-hosted Jitsi; defaults to the public instance. */
const JITSI_BASE = process.env.JITSI_BASE_URL ?? 'https://meet.jit.si'

/** Doors open 15 minutes early and stay open until the class ends. */
const EARLY_MS = 15 * 60_000

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent('/dashboard/live')}`, SITE_URL),
    )
  }

  const liveClass = await prisma.liveClass.findUnique({
    where: { id },
    select: {
      id: true, title: true, roomName: true, provider: true, externalUrl: true,
      startsAt: true, durationMin: true, status: true, courseId: true,
    },
  })

  // 404 rather than 403 for a non-enrolled student: a 403 would confirm the
  // class exists, which is itself information about a course they haven't paid for.
  const notFound = () => NextResponse.json({ error: 'Class not found' }, { status: 404 })
  if (!liveClass) return notFound()

  if (user.role !== 'ADMIN') {
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: liveClass.courseId } },
      select: { id: true },
    })
    if (!enrolled) return notFound()
  }

  if (liveClass.status === 'CANCELLED') {
    return NextResponse.json({ error: 'This class was cancelled.' }, { status: 409 })
  }

  const now = Date.now()
  const opensAt = liveClass.startsAt.getTime() - EARLY_MS
  const closesAt = liveClass.startsAt.getTime() + liveClass.durationMin * 60_000

  if (now < opensAt) {
    return NextResponse.json(
      { error: 'This class has not opened yet. You can join 15 minutes before it starts.' },
      { status: 425 },
    )
  }
  if (now > closesAt) {
    return NextResponse.json(
      { error: 'This class has ended. The recording will appear here once published.' },
      { status: 410 },
    )
  }

  // Mark the register. Upsert so a rejoin after a dropped connection updates
  // the existing row rather than creating a duplicate attendance record.
  await prisma.liveAttendance.upsert({
    where: { userId_liveClassId: { userId: user.id, liveClassId: liveClass.id } },
    create: { userId: user.id, liveClassId: liveClass.id },
    update: { lastSeenAt: new Date() },
  })

  const target =
    liveClass.externalUrl ??
    `${JITSI_BASE}/${liveClass.roomName}#userInfo.displayName=${encodeURIComponent(`"${user.name}"`)}`

  return NextResponse.redirect(target, { status: 302 })
}
