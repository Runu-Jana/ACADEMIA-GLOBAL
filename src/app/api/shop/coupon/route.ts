import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'
import { priceCart } from '@/lib/shop-pricing'
import { validateCoupon } from '@/lib/promotions'

export const dynamic = 'force-dynamic'

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  lines: z
    .array(z.object({ productId: z.string().trim().min(1), qty: z.number().int().positive() }))
    .min(1)
    .max(50),
})

/**
 * Checkout preview: validates a coupon against the live cart and returns the
 * discount. Rate-limited so codes can't be enumerated by brute force. The real
 * discount is computed again at checkout — this is only for display.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'shop-coupon', 20, MINUTE)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Enter a valid code.' }, { status: 400 })
  }

  const priced = await priceCart(parsed.data.lines)
  if (priced.lines.length === 0) {
    return NextResponse.json({ ok: false, message: 'Your cart is empty.' })
  }

  const user = await getCurrentUser()
  const result = await validateCoupon({
    code: parsed.data.code,
    subtotal: priced.subtotal,
    scope: 'SHOP',
    userId: user?.id ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message })
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    title: result.title,
    discount: result.discount,
  })
}
