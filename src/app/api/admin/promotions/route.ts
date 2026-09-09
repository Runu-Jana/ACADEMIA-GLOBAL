import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { normalizeCode } from '@/lib/promotions'

export const dynamic = 'force-dynamic'

/**
 * Promotion create/update payload.
 *
 * Money fields (value for FLAT, minSubtotal, maxDiscount) arrive in PAISE — the
 * admin form converts from the rupees an operator types, so there is one
 * conversion point. Dates arrive as ISO strings or null.
 */
export const promotionSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).nullable().optional().or(z.literal('')),
    type: z.enum(['PERCENT', 'FLAT']),
    value: z.number().int().positive().max(100_000_000),
    scope: z.enum(['SHOP', 'COURSE', 'ALL']),
    minSubtotal: z.number().int().nonnegative().max(100_000_000).nullable().optional(),
    maxDiscount: z.number().int().positive().max(100_000_000).nullable().optional(),
    usageLimit: z.number().int().positive().max(1_000_000).nullable().optional(),
    perUserLimit: z.number().int().positive().max(1_000).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional().or(z.literal('')),
    endsAt: z.string().datetime().nullable().optional().or(z.literal('')),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']),
  })
  .refine((d) => d.type !== 'PERCENT' || (d.value >= 1 && d.value <= 100), {
    message: 'A percentage must be between 1 and 100.',
    path: ['value'],
  })
  .refine((d) => !(d.startsAt && d.endsAt) || new Date(d.startsAt) < new Date(d.endsAt), {
    message: 'The end date must be after the start date.',
    path: ['endsAt'],
  })

export type PromotionInput = z.infer<typeof promotionSchema>

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'ADMIN' ? user : null
}

function blankToNull(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

/** Turns validated input into the Prisma write shape (shared by create + update). */
export function toPromotionData(d: PromotionInput): Prisma.PromotionUncheckedCreateInput {
  return {
    code: normalizeCode(d.code),
    title: d.title,
    description: blankToNull(d.description),
    type: d.type,
    value: d.value,
    scope: d.scope,
    // maxDiscount only makes sense for a percentage cap.
    minSubtotal: d.minSubtotal ?? null,
    maxDiscount: d.type === 'PERCENT' ? d.maxDiscount ?? null : null,
    usageLimit: d.usageLimit ?? null,
    perUserLimit: d.perUserLimit ?? null,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    status: d.status,
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = promotionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the promotion details.' },
      { status: 400 },
    )
  }

  const data = toPromotionData(parsed.data)
  const clash = await prisma.promotion.findUnique({ where: { code: data.code }, select: { id: true } })
  if (clash) {
    return NextResponse.json({ error: 'A promotion with that code already exists.' }, { status: 409 })
  }

  const promotion = await prisma.promotion.create({ data, select: { id: true, code: true } })
  return NextResponse.json({ ok: true, promotion })
}
