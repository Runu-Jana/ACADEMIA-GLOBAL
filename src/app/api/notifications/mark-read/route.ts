import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  id: z.string().trim().min(1).optional(),
  all: z.boolean().optional(),
})

/**
 * Marks one notification read (by id) or every unread one (all: true).
 *
 * The id branch is scoped by userId, so a valid id belonging to someone else
 * can never be marked from another account.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { id, all } = parsed.data
  const where = all
    ? { userId: user.id, readAt: null }
    : id
      ? { id, userId: user.id, readAt: null }
      : null
  if (!where) return NextResponse.json({ error: 'Nothing to mark read.' }, { status: 400 })

  const res = await prisma.notification.updateMany({ where, data: { readAt: new Date() } })
  const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null } })

  return NextResponse.json({ ok: true, updated: res.count, unreadCount })
}
