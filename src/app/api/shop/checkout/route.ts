import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'
import { createRazorpayOrder, paymentsConfigured, razorpayKeyId } from '@/lib/payments/razorpay'
import { priceCart } from '@/lib/shop-pricing'
import { validateCoupon } from '@/lib/promotions'
import { makeOrderNumber, PINCODE_RE, PHONE_RE, INDIAN_STATES } from '@/lib/shop'
import { captureError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

const schema = z.object({
  lines: z
    .array(z.object({ productId: z.string().trim().min(1), qty: z.number().int().positive() }))
    .min(1)
    .max(50),
  couponCode: z.string().trim().min(1).max(40).optional(),
  address: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(120),
    phone: z.string().trim().regex(PHONE_RE, 'Enter a valid Indian mobile number'),
    line1: z.string().trim().min(4).max(160),
    line2: z.string().trim().max(160).optional().or(z.literal('')),
    city: z.string().trim().min(2).max(80),
    state: z.enum(INDIAN_STATES),
    pincode: z.string().trim().regex(PINCODE_RE, 'Enter a valid 6-digit PIN code'),
  }),
})

/**
 * Opens a shop order and hands the browser what it needs to pay.
 *
 * The cart arriving here is ids and quantities only — priceCart re-reads every
 * price from the database, so the amount charged is ours, never the client's.
 *
 * Stock is NOT decremented here. An order that is never paid must not consume
 * inventory, so units come off the shelf in the verify/webhook step once money
 * has actually moved.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'shop-checkout', 12, MINUTE)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the delivery details.' },
      { status: 400 },
    )
  }
  const { lines, address } = parsed.data

  // Signing in is optional for the shop — a guest can buy books. When there is
  // a session we attach it so the order shows in their dashboard.
  const user = await getCurrentUser()

  const priced = await priceCart(lines)
  if (priced.lines.length === 0) {
    return NextResponse.json(
      { error: 'Nothing in your cart is available any more.', cart: priced },
      { status: 409 },
    )
  }

  // If anything changed under the buyer — a sold-out line, a capped quantity —
  // stop and show them the corrected cart rather than silently charging a
  // different total than the one they reviewed.
  if (priced.removed.length > 0 || priced.adjusted) {
    return NextResponse.json(
      { error: 'Your cart changed. Please review it and try again.', cart: priced, changed: true },
      { status: 409 },
    )
  }

  // Coupon (optional). Re-validated here against our own subtotal — the client's
  // idea of the discount is never trusted. An invalid code stops checkout with a
  // 409 so the buyer sees why, rather than being silently charged full price.
  let discount = 0
  let couponCode: string | null = null
  let promotionId: string | null = null
  if (parsed.data.couponCode) {
    const result = await validateCoupon({
      code: parsed.data.couponCode,
      subtotal: priced.subtotal,
      scope: 'SHOP',
      userId: user?.id ?? null,
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, cart: priced, couponInvalid: true },
        { status: 409 },
      )
    }
    discount = result.discount
    couponCode = result.code
    promotionId = result.promotionId
  }

  const total = priced.subtotal - discount + priced.shipping

  const order = await prisma.shopOrder.create({
    data: {
      orderNumber: makeOrderNumber(),
      status: 'PENDING',
      subtotal: priced.subtotal,
      discount,
      shipping: priced.shipping,
      total,
      couponCode,
      promotionId,
      userId: user?.id ?? null,
      name: address.name,
      email: address.email,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      items: {
        create: priced.lines.map((l) => ({
          productId: l.productId,
          title: l.title,
          price: l.price,
          qty: l.qty,
        })),
      },
    },
  })

  if (!paymentsConfigured()) {
    // Dev convenience so the whole flow stays testable before real keys exist.
    // Production refuses rather than handing over goods for free.
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        ok: true,
        demo: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
      })
    }
    return NextResponse.json(
      { error: 'Online payment is not available right now. Please try again later.' },
      { status: 503 },
    )
  }

  try {
    const gateway = await createRazorpayOrder({
      amount: order.total,
      receipt: order.orderNumber,
      notes: { shopOrderId: order.id, orderNumber: order.orderNumber },
    })

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { gatewayOrderId: gateway.id },
    })

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      gatewayOrderId: gateway.id,
      keyId: razorpayKeyId(),
    })
  } catch (error) {
    captureError(error, { scope: 'shop/checkout', orderId: order.id })
    return NextResponse.json(
      { error: 'We could not start the payment. Please try again.' },
      { status: 502 },
    )
  }
}
