import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isCourseLive } from '@/lib/visibility'
import { openOrder, markOrderPaid } from '@/lib/commission'
import { paymentsConfigured } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

const schema = z.object({ courseId: z.string().trim().min(1, 'Course is required') })

/**
 * Completes the in-app demonstration checkout for a paid course.
 *
 * This exists ONLY when no real gateway is configured — the checkout the
 * student just walked through collects no money. If a live gateway IS
 * configured this endpoint refuses, so it can never be used to bypass a real
 * payment. The order is marked paid with a `demo_payment` reference so it stays
 * auditable as a non-cash enrolment.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })

  // A live gateway is configured — real money must be collected, never demoed.
  if (paymentsConfigured()) {
    return NextResponse.json({ error: 'Please complete the secure payment to enrol.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }
  const { courseId } = parsed.data

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      feePerYear: true,
      source: true,
      reviewStatus: true,
      university: { select: { partnerStatus: true } },
    },
  })
  if (!course || !isCourseLive(course)) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Already enrolled → nothing to do.
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ ok: true, enrolled: true, already: true })

  const order = await openOrder(user.id, courseId)
  await markOrderPaid(order.id, 'demo_payment')
  return NextResponse.json({ ok: true, enrolled: true, demo: true, orderId: order.id })
}
