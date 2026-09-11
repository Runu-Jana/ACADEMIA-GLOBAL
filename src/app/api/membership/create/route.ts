import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getMembershipPlan, markMembershipPaid } from '@/lib/membership'
import { createRazorpayOrder, paymentsConfigured, razorpayKeyId } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

const schema = z.object({ planId: z.string().trim().min(1) })

/**
 * Starts (or completes) a membership purchase.
 *
 * Mirrors the course payment flow: a PENDING membership row is opened and a
 * Razorpay order is created against it for the browser to pay. Activation happens
 * only once payment is confirmed server-side (verify endpoint + webhook), never
 * here. Where Razorpay isn't configured, a dev build activates straight away so
 * the flow stays testable; production refuses rather than hand out a free pass.
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
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const plan = getMembershipPlan(parsed.data.planId)
  if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })

  // Reuse a still-unpaid row for this plan so repeated clicks don't spawn
  // duplicate gateway orders.
  let membership =
    (await prisma.membership.findFirst({
      where: { userId: user.id, planId: plan.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })) ??
    (await prisma.membership.create({
      data: { userId: user.id, planId: plan.id, amount: plan.price, status: 'PENDING' },
    }))

  // Keep the snapshot honest if the price changed since a stale PENDING row.
  if (membership.amount !== plan.price) {
    membership = await prisma.membership.update({
      where: { id: membership.id },
      data: { amount: plan.price },
    })
  }

  if (!paymentsConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      await markMembershipPaid(membership.id, 'demo_payment')
      return NextResponse.json({ ok: true, joined: true, demo: true })
    }
    return NextResponse.json(
      { error: 'Online payment is not available right now. Please try again later.', code: 'payments_unconfigured' },
      { status: 503 },
    )
  }

  let gatewayOrderId = membership.gatewayOrderId
  if (!gatewayOrderId) {
    try {
      const rzp = await createRazorpayOrder({
        amount: plan.price,
        currency: membership.currency,
        receipt: membership.id,
        notes: { kind: 'membership', planId: plan.id, userId: user.id },
      })
      gatewayOrderId = rzp.id
      await prisma.membership.update({ where: { id: membership.id }, data: { gatewayOrderId } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start payment.'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  return NextResponse.json({
    ok: true,
    requiresPayment: true,
    membershipId: membership.id,
    razorpay: {
      keyId: razorpayKeyId(),
      orderId: gatewayOrderId,
      amount: plan.price,
      currency: membership.currency,
      name: 'Shiksha Sarthi',
      description: `All-access membership (${plan.months === 1 ? '1 month' : plan.months === 12 ? '1 year' : `${plan.months} months`})`,
      prefill: { name: user.name, email: user.email, contact: user.phone ?? '' },
    },
  })
}
