import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { refundShopOrder } from '@/lib/shop-orders'

export const dynamic = 'force-dynamic'

const schema = z.object({
  status: z.enum(['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  courier: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  adminNote: z.string().trim().max(1000).optional(),
})

/**
 * Which statuses may follow which. Fulfilment only ever moves forwards, so a
 * delivered parcel can't be walked back to "packed" by a stray click.
 * Cancel/refund are available from any open state and are terminal.
 */
const NEXT: Record<string, string[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PACKED', 'CANCELLED', 'REFUNDED'],
  PACKED: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const { id } = await params
  const order = await prisma.shopOrder.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
  }
  const { status, courier, trackingNumber, adminNote } = parsed.data

  if (status) {
    const allowed = NEXT[order.status] ?? []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `An order that is ${order.status} cannot move to ${status}.` },
        { status: 409 },
      )
    }

    // Cancel and refund put stock back, so they go through the shared helper
    // rather than a bare status write.
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      await refundShopOrder(order.id, status)
      if (courier || trackingNumber || adminNote) {
        await prisma.shopOrder.update({
          where: { id },
          data: {
            ...(courier !== undefined ? { courier: courier || null } : {}),
            ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {}),
            ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
          },
        })
      }
      return NextResponse.json({ ok: true, status })
    }
  }

  const updated = await prisma.shopOrder.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(status === 'SHIPPED' ? { shippedAt: new Date() } : {}),
      ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      ...(courier !== undefined ? { courier: courier || null } : {}),
      ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {}),
      ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
    },
    select: { id: true, status: true },
  })

  return NextResponse.json({ ok: true, ...updated })
}
