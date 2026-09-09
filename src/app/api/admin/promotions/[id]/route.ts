import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { promotionSchema, toPromotionData } from '../route'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'ADMIN' ? user : null
}

/** Updates a promotion. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }
  const { id } = await params

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

  const existing = await prisma.promotion.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })

  const data = toPromotionData(parsed.data)
  const clash = await prisma.promotion.findUnique({ where: { code: data.code }, select: { id: true } })
  if (clash && clash.id !== id) {
    return NextResponse.json({ error: 'Another promotion already uses that code.' }, { status: 409 })
  }

  await prisma.promotion.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

/** Deletes a promotion — only if it has never been redeemed, so paid-order
 *  history stays intact. A used code should be PAUSED, not removed. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }
  const { id } = await params

  const promo = await prisma.promotion.findUnique({ where: { id }, select: { usedCount: true } })
  if (!promo) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
  if (promo.usedCount > 0) {
    return NextResponse.json(
      { error: 'This code has been used. Pause it instead of deleting it.' },
      { status: 409 },
    )
  }

  await prisma.promotion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
