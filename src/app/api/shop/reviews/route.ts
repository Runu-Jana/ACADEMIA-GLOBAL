import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
})

// A buyer may review an item only once they have actually paid for it, so a
// PENDING (unpaid) or CANCELLED cart never unlocks a review. A REFUNDED order
// is excluded too — the money was returned, so it no longer counts as a
// verified purchase.
const PAID_STATUSES = ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED']

/**
 * Create or update the signed-in buyer's review for a shop product.
 *
 * Gated on a paid purchase — only someone who bought the item may rate it, and
 * the `@@unique([userId, productId])` constraint keeps it to one review each.
 *
 * `product.rating` / `product.reviews` are denormalised aggregates the cards and
 * catalog read, kept here as a running mean and count: a new review extends the
 * base by one, an edit swaps its own contribution, so the headline number never
 * needs a full re-scan of every row.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    raw = {}
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please choose a star rating and write at least 10 characters.' },
      { status: 400 },
    )
  }
  const { productId, rating, body } = parsed.data

  const bought = await prisma.shopOrder.findFirst({
    where: {
      userId: user.id,
      status: { in: PAID_STATUSES },
      items: { some: { productId } },
    },
    select: { id: true },
  })
  if (!bought) {
    return NextResponse.json(
      { error: 'Only verified buyers can review this item.' },
      { status: 403 },
    )
  }

  const prev = await prisma.productReview.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { rating: true },
  })

  await prisma.productReview.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, rating, body },
    update: { rating, body },
  })

  await recomputeProductRating(productId, prev ? { replace: prev.rating, with: rating } : { add: rating })

  return NextResponse.json({ ok: true, edited: Boolean(prev) })
}

/** Remove the signed-in buyer's own review and roll the aggregate back. */
export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  const productId = new URL(req.url).searchParams.get('productId') ?? ''
  if (!productId) return NextResponse.json({ error: 'Missing product.' }, { status: 400 })

  const existing = await prisma.productReview.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { rating: true },
  })
  if (!existing) return NextResponse.json({ ok: true })

  await prisma.productReview.delete({
    where: { userId_productId: { userId: user.id, productId } },
  })

  await recomputeProductRating(productId, { remove: existing.rating })

  return NextResponse.json({ ok: true })
}

type RatingChange =
  | { add: number }
  | { remove: number }
  | { replace: number; with: number }

/** Shift the stored running mean/count by a single review's change. */
async function recomputeProductRating(productId: string, change: RatingChange) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { rating: true, reviews: true },
  })
  if (!product) return

  const sum = product.rating * product.reviews
  let count = product.reviews
  let newSum = sum

  if ('add' in change) {
    count += 1
    newSum = sum + change.add
  } else if ('remove' in change) {
    count = Math.max(0, count - 1)
    newSum = sum - change.remove
  } else {
    newSum = sum - change.replace + change.with
  }

  const rating = count > 0 ? Math.round((newSum / count) * 100) / 100 : 0
  await prisma.product.update({
    where: { id: productId },
    data: { rating, reviews: count },
  })
}
