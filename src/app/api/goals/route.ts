import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { MIN_WEEKLY_TARGET, MAX_WEEKLY_TARGET } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

const schema = z.object({
  weeklyDays: z.coerce.number().int().min(MIN_WEEKLY_TARGET).max(MAX_WEEKLY_TARGET),
})

/** Sets the signed-in student's weekly learning target (days per week). */
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
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose between 1 and 7 days a week.' }, { status: 400 })
  }
  const { weeklyDays } = parsed.data

  await prisma.learningGoal.upsert({
    where: { userId: user.id },
    create: { userId: user.id, weeklyDays },
    update: { weeklyDays },
  })

  return NextResponse.json({ ok: true, weeklyDays })
}
