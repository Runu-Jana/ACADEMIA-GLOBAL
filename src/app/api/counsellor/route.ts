import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { liveCourses } from '@/lib/visibility'
import { readJson } from '@/app/api/admin/_lib/guard'
import { requestLiveAgent } from '@/lib/live-agent'
import {
  parseIntent,
  relaxationLadder,
  composeReply,
  detectAgentRequest,
  INTRO_REPLY,
  CLARIFY_REPLY,
  HANDOFF_REPLY,
  type Constraint,
} from './_lib/recommend'

export const dynamic = 'force-dynamic'

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Type a question first')
    .max(500, 'That message is a bit long — try a shorter question'),
  // The chat passes the lead it captured up front (anonymous visitors), so an
  // in-message "talk to a human" can raise the handoff without a round-trip.
  leadId: z.string().trim().max(40).optional(),
})

const courseSelect = {
  id: true,
  slug: true,
  title: true,
  level: true,
  mode: true,
  stream: true,
  durationYears: true,
  feePerYear: true,
  originalFee: true,
  rating: true,
  reviews: true,
  university: { select: { name: true, shortName: true, slug: true } },
} satisfies Prisma.CourseSelect

function whereFor(c: Constraint): Prisma.CourseWhereInput {
  return {
    ...(c.streams.length && { stream: { in: c.streams } }),
    ...(c.levels.length && { level: { in: c.levels } }),
    ...(c.modes.length && { mode: { in: c.modes } }),
    ...(c.maxFee !== null && { feePerYear: { lte: c.maxFee } }),
  }
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid message' },
      { status: 400 },
    )
  }

  const { message, leadId } = parsed.data
  const user = await getCurrentUser()

  // Explicit "talk to a human" typed into the chat → raise the handoff and
  // confirm, instead of trying to recommend courses. Needs a lead to attach to
  // (the anonymous chat always has one; a signed-in visitor gets one created).
  if (detectAgentRequest(message)) {
    const handoff = await requestLiveAgent({
      leadId,
      user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null,
      message,
    })
    if (handoff.ok) {
      return NextResponse.json({ reply: HANDOFF_REPLY, courses: [], handoff: true, persisted: Boolean(user) })
    }
    // No details on file yet (anonymous, pre-capture) — ask the UI to collect them.
    return NextResponse.json({ reply: HANDOFF_REPLY, courses: [], needContact: true, persisted: false })
  }

  const intent = parseIntent(message)

  const budgetLed = intent.cheapFirst || intent.maxFee !== null
  const orderBy: Prisma.CourseOrderByWithRelationInput[] = budgetLed
    ? [{ feePerYear: 'asc' }, { rating: 'desc' }]
    : [{ rating: 'desc' }, { reviews: 'desc' }]
  const limit = budgetLed ? 4 : 3

  const findCourses = (where: Prisma.CourseWhereInput) =>
    prisma.course.findMany({ where: liveCourses(where), orderBy, take: limit, select: courseSelect })

  let courses: Awaited<ReturnType<typeof findCourses>> = []
  let dropped: string[] = []

  if (intent.greeting) {
    // A bare hello gets an introduction plus a few genuinely popular programmes.
    courses = await findCourses({ featured: true })
  } else if (intent.hasSignal) {
    // The first rung that returns anything wins: one exact match beats three
    // loose ones, and it keeps the "I widened the search" line truthful.
    for (const step of relaxationLadder(intent)) {
      const found = await findCourses(whereFor(step.constraint))
      if (found.length > 0) {
        courses = found
        dropped = step.dropped
        break
      }
    }
  }

  const reply = intent.greeting
    ? INTRO_REPLY
    : intent.hasSignal
      ? composeReply({ intent, count: courses.length, dropped })
      : CLARIFY_REPLY

  if (!intent.hasSignal && !intent.greeting) courses = []

  // Only signed-in visitors get a persisted thread; anonymous chats stay in the
  // component's state and are never written anywhere.
  if (user) {
    const now = Date.now()
    await prisma.$transaction([
      prisma.chatMessage.create({
        // courseId omitted → null: this is the recommender thread, kept
        // distinct from the per-course AI tutor's messages.
        data: { userId: user.id, role: 'user', content: message, createdAt: new Date(now) },
      }),
      prisma.chatMessage.create({
        // +1ms keeps the pair in order even when both land in the same tick.
        data: { userId: user.id, role: 'assistant', content: reply, createdAt: new Date(now + 1) },
      }),
    ])
  }

  return NextResponse.json({ reply, courses, persisted: Boolean(user) })
}

/** Clears the signed-in visitor's saved thread. */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: true, cleared: 0 })

  // Only the recommender thread (courseId:null) — never the tutor threads.
  const { count } = await prisma.chatMessage.deleteMany({
    where: { userId: user.id, courseId: null },
  })
  return NextResponse.json({ ok: true, cleared: count })
}
