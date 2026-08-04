import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * The host's way into a live class.
 *
 * Mirrors the student `join` route but is ADMIN-only and skips the enrolment
 * check and the time gate — a teacher needs to enter early to set up camera,
 * mic and screen share before students arrive. Redirects straight into the
 * Jitsi room (or the external Zoom/Meet link) where the browser prompts for
 * camera/mic access.
 */

const JITSI_BASE = process.env.JITSI_BASE_URL ?? 'https://meet.jit.si'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent('/admin/live')}`,
        process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      ),
    )
  }

  const liveClass = await prisma.liveClass.findUnique({
    where: { id },
    select: { id: true, title: true, roomName: true, provider: true, externalUrl: true, status: true },
  })
  if (!liveClass) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  if (liveClass.status === 'CANCELLED' || liveClass.status === 'ENDED') {
    return NextResponse.json(
      { error: 'This class is no longer running. Set it back to Scheduled or Go live first.' },
      { status: 409 },
    )
  }

  // An external provider (Zoom/Meet) is just its link; otherwise build the
  // Jitsi room URL. The host joins with their name shown to the room.
  const target =
    liveClass.externalUrl ??
    `${JITSI_BASE}/${liveClass.roomName}#userInfo.displayName=${encodeURIComponent(`"${user.name} (Host)"`)}`

  return NextResponse.redirect(target, { status: 302 })
}
