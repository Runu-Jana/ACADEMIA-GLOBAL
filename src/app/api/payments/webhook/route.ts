import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { markOrderPaid, refundOrder } from '@/lib/commission'
import { verifyWebhookSignature } from '@/lib/payments/razorpay'
import { markShopOrderPaid, refundShopOrder } from '@/lib/shop-orders'
import { markMembershipPaid, refundMembership } from '@/lib/membership'
import { captureError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

/**
 * Razorpay webhook — the reliable side of confirmation.
 *
 * The verify endpoint depends on the browser reaching it; this doesn't. If a
 * student pays and closes the tab, Razorpay still tells us here. The signature
 * is over the RAW body, so we must read the body as text and verify BEFORE
 * parsing — never trust an event we haven't authenticated.
 *
 * markOrderPaid is idempotent, so this and the verify endpoint firing for the
 * same payment is a no-op the second time.
 */
export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: {
    event?: string
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } }
      order?: { entity?: { id?: string } }
    }
  }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const type = event.event
  const gatewayOrderId =
    event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id ?? null

  try {
    // Course enrolments, shop purchases and memberships all open Razorpay
    // orders, so an event could belong to any of them. Look in each table rather
    // than assuming — the gatewayOrderId is unique across them.
    if ((type === 'payment.captured' || type === 'order.paid') && gatewayOrderId) {
      const order = await prisma.order.findUnique({ where: { gatewayOrderId } })
      if (order) await markOrderPaid(order.id, event.payload?.payment?.entity?.id)

      const shopOrder = await prisma.shopOrder.findUnique({ where: { gatewayOrderId } })
      if (shopOrder) await markShopOrderPaid(shopOrder.id, event.payload?.payment?.entity?.id)

      const membership = await prisma.membership.findUnique({ where: { gatewayOrderId } })
      if (membership) await markMembershipPaid(membership.id, event.payload?.payment?.entity?.id)
    } else if (type === 'refund.processed' && gatewayOrderId) {
      const order = await prisma.order.findUnique({ where: { gatewayOrderId } })
      if (order) await refundOrder(order.id)

      const shopOrder = await prisma.shopOrder.findUnique({ where: { gatewayOrderId } })
      if (shopOrder) await refundShopOrder(shopOrder.id)

      const membership = await prisma.membership.findUnique({ where: { gatewayOrderId } })
      if (membership) await refundMembership(membership.id)
    }
  } catch (err) {
    // Capture, then 500 so Razorpay retries — the handlers are idempotent, so a
    // retry after a transient failure is safe.
    captureError(err, { scope: 'payments/webhook', event: type, gatewayOrderId })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  // Always 200 a signed event we understood — Razorpay retries on non-2xx.
  return NextResponse.json({ ok: true })
}
