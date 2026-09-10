import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sanitizeChannels } from '@/lib/notification-prefs'

export const dynamic = 'force-dynamic'

/** Saves the signed-in student's notification channel preferences. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const channels = sanitizeChannels((body as { channels?: unknown } | null)?.channels)

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, channels },
    update: { channels },
  })

  return NextResponse.json({ ok: true })
}
