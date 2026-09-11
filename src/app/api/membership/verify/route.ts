import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { markMembershipPaid } from '@/lib/membership'
import { verifyCheckoutSignature } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

const schema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
})

/**
 * Confirms a membership checkout the browser just completed.
 *
 * Verifies HMAC(order_id|payment_id, key_secret) server-side — the browser's "it
 * worked" only becomes a fact once the signature checks out. The webhook is the
 * reliable backstop, and both call the idempotent markMembershipPaid.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 })
  }
  const { razorpayOrderId, razorpayPaymentId, signature } = parsed.data

  if (!verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, signature)) {
    return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 400 })
  }

  const membership = await prisma.membership.findUnique({ where: { gatewayOrderId: razorpayOrderId } })
  // A valid signature for someone else's order is still not this user's to confirm.
  if (!membership || membership.userId !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  await markMembershipPaid(membership.id, razorpayPaymentId)
  return NextResponse.json({ ok: true, joined: true })
}
