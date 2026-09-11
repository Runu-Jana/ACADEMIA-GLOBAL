import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isCourseLive } from '@/lib/visibility'
import { openOrder, markOrderPaid } from '@/lib/commission'
import { hasActiveMembership, grantMembershipEnrolment, membershipCoversSource } from '@/lib/membership'
import { createRazorpayOrder, paymentsConfigured, razorpayKeyId } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

const schema = z.object({ courseId: z.string().trim().min(1, 'Course is required') })

/**
 * Starts (or completes) payment for enrolling in a course.
 *
 * Free courses enrol immediately. Paid courses get a Razorpay order back for the
 * browser to open Checkout against — enrolment then happens only once payment is
 * confirmed server-side (verify endpoint + webhook), never here. Where Razorpay
 * isn't configured, a dev build falls back to the demo enrol so the flow stays
 * testable; production refuses rather than enrol without collecting money.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })

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
      title: true,
      feePerYear: true,
      source: true,
      reviewStatus: true,
      university: { select: { partnerStatus: true } },
    },
  })
  if (!course || !isCourseLive(course)) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Already enrolled → nothing to pay.
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ ok: true, enrolled: true, already: true })

  // Covered by an active all-access membership → enrol free, no order or
  // commission. Only our own platform programmes are covered (see membership.ts).
  if (
    course.feePerYear > 0 &&
    membershipCoversSource(course.source) &&
    (await hasActiveMembership(user.id))
  ) {
    await grantMembershipEnrolment(user.id, courseId)
    return NextResponse.json({ ok: true, enrolled: true, viaMembership: true })
  }

  const order = await openOrder(user.id, courseId)

  // Free programme — enrol straight away.
  if (course.feePerYear <= 0) {
    await markOrderPaid(order.id)
    return NextResponse.json({ ok: true, enrolled: true })
  }

  if (!paymentsConfigured()) {
    // Dev convenience so the wizard is testable before real keys are added.
    if (process.env.NODE_ENV !== 'production') {
      await markOrderPaid(order.id, 'demo_payment')
      return NextResponse.json({ ok: true, enrolled: true, demo: true })
    }
    return NextResponse.json(
      { error: 'Online payment is not available right now. Please try again later.', code: 'payments_unconfigured' },
      { status: 503 },
    )
  }

  // Reuse the gateway order across retries so hammering "Pay" doesn't spawn duplicates.
  let gatewayOrderId = order.gatewayOrderId
  if (!gatewayOrderId) {
    try {
      const rzp = await createRazorpayOrder({
        amount: order.amount,
        currency: order.currency,
        receipt: order.id,
        notes: { courseId, userId: user.id },
      })
      gatewayOrderId = rzp.id
      await prisma.order.update({ where: { id: order.id }, data: { gatewayOrderId } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start payment.'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  return NextResponse.json({
    ok: true,
    requiresPayment: true,
    razorpay: {
      keyId: razorpayKeyId(),
      orderId: gatewayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Shiksha Sarthi',
      description: course.title,
      prefill: { name: user.name, email: user.email, contact: user.phone ?? '' },
    },
  })
}
