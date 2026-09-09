import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatPaise } from '@/lib/shop'

/**
 * The promotion / coupon engine.
 *
 * Deterministic by design: this module — never an AI, never the client — decides
 * whether a code is valid and how much it takes off. A discount always applies to
 * the goods subtotal (never shipping) and is clamped to the subtotal, so a coupon
 * can reduce an order to ₹0 of goods but never produce a negative charge.
 *
 * `validateCoupon` is the single source of truth, called by both the checkout
 * preview (`/api/shop/coupon`) and the real checkout, so the amount a buyer is
 * shown and the amount they are charged come from one calculation.
 */

export type PromotionType = 'PERCENT' | 'FLAT'
export type PromotionScope = 'SHOP' | 'COURSE' | 'ALL'
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED'

/** Trimmed, upper-cased, inner spaces stripped — how codes are stored and matched. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/** Just the fields the discount math needs — pure and unit-testable. */
export type DiscountInput = {
  type: string
  value: number
  maxDiscount: number | null
}

/**
 * The discount (in paise) a promotion grants on a subtotal, clamped to
 * [0, subtotal]. PERCENT applies `value`% (optionally capped by maxDiscount);
 * FLAT takes `value` paise off.
 */
export function computeDiscount(promo: DiscountInput, subtotal: number): number {
  if (subtotal <= 0) return 0
  let d = 0
  if (promo.type === 'PERCENT') {
    d = Math.round((subtotal * promo.value) / 100)
    if (promo.maxDiscount != null) d = Math.min(d, promo.maxDiscount)
  } else {
    d = promo.value
  }
  return Math.max(0, Math.min(d, subtotal))
}

export type CouponReason =
  | 'not_found' | 'inactive' | 'not_started' | 'expired'
  | 'wrong_scope' | 'below_min' | 'usage_exhausted' | 'user_limit' | 'no_discount'

export type CouponResult =
  | { ok: true; promotionId: string; code: string; title: string; discount: number }
  | { ok: false; reason: CouponReason; message: string }

function fail(reason: CouponReason, message: string): CouponResult {
  return { ok: false, reason, message }
}

/**
 * Validates a code against a live subtotal + scope and returns the discount.
 * Every eligibility rule (window, scope, minimum, usage caps) is checked here.
 */
export async function validateCoupon(args: {
  code: string
  subtotal: number
  scope: PromotionScope
  userId?: string | null
  now?: Date
}): Promise<CouponResult> {
  const code = normalizeCode(args.code)
  if (!code) return fail('not_found', "That code isn't valid.")

  const promo = await prisma.promotion.findUnique({ where: { code } })
  if (!promo) return fail('not_found', "That code isn't valid.")

  const now = args.now ?? new Date()
  if (promo.status !== 'ACTIVE') return fail('inactive', 'This offer is not currently available.')
  if (promo.startsAt && promo.startsAt > now) return fail('not_started', 'This offer hasn’t started yet.')
  if (promo.endsAt && promo.endsAt < now) return fail('expired', 'This offer has expired.')
  if (promo.scope !== 'ALL' && promo.scope !== args.scope) {
    return fail('wrong_scope', 'This code can’t be used on this order.')
  }
  if (promo.minSubtotal != null && args.subtotal < promo.minSubtotal) {
    return fail('below_min', `Spend at least ${formatPaise(promo.minSubtotal)} to use this code.`)
  }
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return fail('usage_exhausted', 'This code has reached its usage limit.')
  }
  if (promo.perUserLimit != null && args.userId) {
    const used = await prisma.promotionRedemption.count({
      where: { promotionId: promo.id, userId: args.userId },
    })
    if (used >= promo.perUserLimit) return fail('user_limit', 'You’ve already used this code.')
  }

  const discount = computeDiscount(promo, args.subtotal)
  if (discount <= 0) return fail('no_discount', 'This code doesn’t apply to your order.')

  return { ok: true, promotionId: promo.id, code: promo.code, title: promo.title, discount }
}

/**
 * Records a confirmed redemption inside the paid-order transaction: bumps the
 * denormalised counter and writes the redemption row. Called once, on the
 * PENDING→PAID transition, so an abandoned checkout never burns a code. The
 * unique `shopOrderId` is a backstop against a double-confirm.
 */
export async function recordRedemption(
  tx: Prisma.TransactionClient,
  args: { promotionId: string; userId: string | null; shopOrderId: string; amount: number },
): Promise<void> {
  await tx.promotion.update({
    where: { id: args.promotionId },
    data: { usedCount: { increment: 1 } },
  })
  await tx.promotionRedemption.create({
    data: {
      promotionId: args.promotionId,
      userId: args.userId,
      shopOrderId: args.shopOrderId,
      amount: args.amount,
    },
  })
}
