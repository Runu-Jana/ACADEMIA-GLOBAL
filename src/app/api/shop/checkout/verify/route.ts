import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'
import { verifyCheckoutSignature, paymentsConfigured } from '@/lib/payments/razorpay'
import { markShopOrderPaid } from '@/lib/shop-orders'

export const dynamic = 'force-dynamic'

const schema = z.object({
  orderId: z.string().trim().min(1),
  razorpayOrderId: z.string().trim().min(1).optional(),
  razorpayPaymentId: z.string().trim().min(1).optional(),
  signature: z.string().trim().min(1).optional(),
})

/**
 * Confirms a shop payment the browser just completed.
 *
 * The signature is HMAC(order_id|payment_id, key_secret) — only Razorpay and we
 * can produce it, so verifying it server-side turns the browser's claim into a
 * fact. The webhook is the reliable backstop; both call the same idempotent
 * markShopOrderPaid, so arriving twice is harmless.
 *
 * Unlike course checkout this does NOT require a session — the shop allows
 * guest purchases, so the order id plus a valid gateway signature is the proof.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'shop-verify', 20, MINUTE)
  if (limited) return limited

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
  const { orderId, razorpayOrderId, razorpayPaymentId, signature } = parsed.data

  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (paymentsConfigured()) {
    if (!razorpayOrderId || !razorpayPaymentId || !signature) {
      return NextResponse.json({ error: 'Payment details missing' }, { status: 400 })
    }
    // The signed order id must be the one we opened for THIS order, otherwise a
    // valid signature from any other purchase would confirm this one.
    if (order.gatewayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 400 })
    }
    if (!verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, signature)) {
      return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 400 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    // No keys in production means no way to prove payment — refuse rather than
    // marking an unpaid order as paid.
    return NextResponse.json({ error: 'Payments are not configured.' }, { status: 503 })
  }

  await markShopOrderPaid(order.id, razorpayPaymentId)

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber })
}
