import { NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'
import { priceCart } from '@/lib/shop-pricing'

export const dynamic = 'force-dynamic'

const schema = z.object({
  lines: z
    .array(z.object({ productId: z.string().trim().min(1), qty: z.number().int().positive() }))
    .max(50),
})

/**
 * Re-prices a browser cart against live data.
 *
 * The cart page calls this on load so a basket assembled last week shows today's
 * prices, today's stock, and drops anything that has since been unpublished —
 * rather than discovering all of that at the payment step.
 *
 * Read-only: it never writes an order and never reserves stock.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'shop-cart', 60, MINUTE)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart' }, { status: 400 })
  }

  const priced = await priceCart(parsed.data.lines)
  return NextResponse.json(priced)
}
