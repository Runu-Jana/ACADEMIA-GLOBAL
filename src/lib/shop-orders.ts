import { prisma } from '@/lib/prisma'
import { sendEmail, sendAdminEmail } from '@/lib/email'
import { shopOrderEmail, shopOrderAdminEmail } from '@/lib/emails'
import { recordRedemption } from '@/lib/promotions'
import { captureError } from '@/lib/observability'

/**
 * Turns a confirmed payment into a fulfilled-able order.
 *
 * Called from two places that can race each other — the browser's verify call
 * and Razorpay's webhook — so it must be idempotent. The status check runs
 * inside the transaction that decrements stock, which is what stops a
 * double-confirm taking the same units off the shelf twice.
 *
 * Stock lands here rather than at order creation on purpose: an abandoned
 * checkout should never hold inventory hostage.
 */
export async function markShopOrderPaid(
  orderId: string,
  gatewayPaymentId?: string,
): Promise<{ alreadyPaid: boolean }> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) throw new Error(`Shop order ${orderId} not found`)

    // Anything past PENDING has already been through here.
    if (order.status !== 'PENDING') return { alreadyPaid: true, order }

    for (const item of order.items) {
      if (!item.productId) continue
      // decrement can drive stock negative if two orders land together; clamp
      // to zero afterwards rather than failing a payment we've already taken.
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.qty } },
      })
      await tx.product.updateMany({
        where: { id: item.productId, stock: { lt: 0 } },
        data: { stock: 0 },
      })
    }

    const updated = await tx.shopOrder.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(gatewayPaymentId ? { gatewayPaymentId } : {}),
      },
      include: { items: true },
    })

    // Burn the coupon now that money has actually moved — one redemption per
    // order, gated by the PENDING→PAID transition above so a webhook retry can't
    // double-count it.
    if (order.promotionId && order.discount > 0) {
      await recordRedemption(tx, {
        promotionId: order.promotionId,
        userId: order.userId,
        shopOrderId: order.id,
        amount: order.discount,
      })
    }

    return { alreadyPaid: false, order: updated }
  })

  // Email is best-effort and must never fail a paid order.
  if (!result.alreadyPaid) {
    const { order } = result
    try {
      await sendEmail(order.email, shopOrderEmail(order))
      await sendAdminEmail(shopOrderAdminEmail(order))
    } catch (error) {
      captureError(error, { scope: 'shop/order-email', orderId })
    }
  }

  return { alreadyPaid: result.alreadyPaid }
}

/**
 * Cancels or refunds an order and puts the units back on the shelf.
 *
 * Idempotent in the same way as markShopOrderPaid: stock is only restored on the
 * transition out of a stock-consuming state, so a webhook retry can't inflate
 * inventory. Orders that never reached PAID never took stock, so they simply
 * change status.
 */
export async function refundShopOrder(
  orderId: string,
  status: 'REFUNDED' | 'CANCELLED' = 'REFUNDED',
): Promise<{ alreadyClosed: boolean }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) throw new Error(`Shop order ${orderId} not found`)

    if (order.status === 'REFUNDED' || order.status === 'CANCELLED') {
      return { alreadyClosed: true }
    }

    // Only orders that actually consumed stock give it back.
    const tookStock = order.status !== 'PENDING'
    if (tookStock) {
      for (const item of order.items) {
        if (!item.productId) continue
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        })
      }
    }

    await tx.shopOrder.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === 'REFUNDED' ? { refundedAt: new Date() } : { cancelledAt: new Date() }),
      },
    })

    return { alreadyClosed: false }
  })
}
