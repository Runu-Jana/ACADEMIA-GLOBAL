import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { markOrderPaid } from '@/lib/commission'
import { verifyCheckoutSignature } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

const schema = z.object({
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
})

/**
 * Confirms a checkout the browser just completed.
 *
 * The signature is HMAC(order_id|payment_id, key_secret) — only Razorpay (and
 * us) can produce it, so verifying it server-side turns the browser's "it
 * worked" into a fact we can act on. This is the fast-path confirmation; the
 * webhook is the reliable backstop, and both call the same idempotent
 * markOrderPaid, so a double-confirm is harmless.
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

  const order = await prisma.order.findUnique({ where: { gatewayOrderId: razorpayOrderId } })
  // Scope to the signed-in payer — a valid signature for someone else's order is
  // still not this user's to confirm.
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  await markOrderPaid(order.id, razorpayPaymentId)
  return NextResponse.json({ ok: true, enrolled: true })
}
