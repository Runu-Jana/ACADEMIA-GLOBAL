import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { openOrder, markOrderPaid } from '@/lib/commission'
import { hasActiveMembership, grantMembershipEnrolment, membershipCoversSource } from '@/lib/membership'
import { isCourseLive } from '@/lib/visibility'

const schema = z.object({
  courseId: z.string().trim().min(1, 'Course is required'),
  /** Dev-only shortcut so the admission wizard is testable before Razorpay lands. */
  demoPay: z.boolean().optional(),
  /** Deliberate re-enrolment: start a fresh attempt even if already enrolled. */
  reenroll: z.boolean().optional(),
})

/**
 * Starts an enrolment.
 *
 * Free courses enrol immediately. Paid courses get an order back and enrol only
 * once payment is confirmed — by the gateway webhook, never by the browser,
 * since a client-side "payment succeeded" is a claim rather than a fact.
 *
 * Idempotent: repeat calls return the existing enrolment or pending order, so
 * the wizard's final submit is safe to retry.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
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
      { error: parsed.error.errors[0]?.message ?? 'Invalid details' },
      { status: 400 },
    )
  }

  const { courseId, demoPay, reenroll } = parsed.data

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      feePerYear: true,
      source: true,
      reviewStatus: true,
      university: { select: { partnerStatus: true } },
    },
  })
  // Can't enrol into something students aren't allowed to see. Existing
  // enrolments keep working — the learn page gates on enrolment, not publish
  // status — so unpublishing a course never locks out a paid-up student.
  if (!course || !isCourseLive(course)) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Their most recent attempt at this course, if any.
  const existing = await prisma.enrollment.findFirst({
    where: { userId: session.userId, courseId },
    orderBy: { enrolledAt: 'desc' },
  })
  // Already enrolled and not deliberately re-enrolling → return the current
  // attempt so the UI can offer "Go to classroom" or an explicit "Enrol again".
  if (existing && !reenroll) {
    return NextResponse.json({
      ok: true,
      created: false,
      alreadyEnrolled: true,
      completed: existing.status === 'COMPLETED',
      enrollment: existing,
    })
  }

  const latest = () =>
    prisma.enrollment.findFirst({
      where: { userId: session.userId, courseId },
      orderBy: { enrolledAt: 'desc' },
    })

  // Covered by an active all-access membership → enrol free, no order or
  // commission. Platform programmes only (see membership.ts).
  if (
    course.feePerYear > 0 &&
    membershipCoversSource(course.source) &&
    (await hasActiveMembership(session.userId))
  ) {
    await grantMembershipEnrolment(session.userId, courseId, { reenroll })
    return NextResponse.json({ ok: true, created: true, viaMembership: true, enrollment: await latest() }, { status: 201 })
  }

  const order = await openOrder(session.userId, courseId, { reenroll })

  // Free programme — nothing to collect, so enrol straight away.
  if (course.feePerYear <= 0) {
    const { commission } = await markOrderPaid(order.id)
    return NextResponse.json(
      { ok: true, created: true, enrollment: await latest(), commissionBooked: Boolean(commission) },
      { status: 201 },
    )
  }

  // Dev-only bypass. Guarded by NODE_ENV so it can never confirm a real payment
  // in production, where only the signed gateway webhook may do that.
  if (demoPay) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Payment must be completed through the payment gateway.' },
        { status: 400 },
      )
    }
    const { commission } = await markOrderPaid(order.id, 'demo_payment')
    return NextResponse.json(
      { ok: true, created: true, demo: true, enrollment: await latest(), commissionBooked: Boolean(commission) },
      { status: 201 },
    )
  }

  // Paid course, no payment yet — hand the order back for the payment step.
  return NextResponse.json(
    {
      ok: true,
      created: false,
      requiresPayment: true,
      order: { id: order.id, amount: order.amount, currency: order.currency },
    },
    { status: 202 },
  )
}
