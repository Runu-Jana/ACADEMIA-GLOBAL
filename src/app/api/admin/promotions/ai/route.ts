import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'
import { generatePromotionCampaign, mapPromotionError } from '@/lib/ai/promotion'

export const dynamic = 'force-dynamic'

const schema = z.object({
  brief: z.string().trim().min(6).max(600),
  scope: z.enum(['SHOP', 'COURSE', 'ALL']).default('SHOP'),
})

/** Drafts a promotion from an operator's brief. Admin-only; the result only
 *  pre-fills the form — nothing is saved until the operator submits it. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const limited = enforceRateLimit(req, 'promo-ai', 10, MINUTE)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Write a short brief (at least a few words).' }, { status: 400 })
  }

  try {
    const suggestion = await generatePromotionCampaign(parsed.data, { userId: user.id })
    return NextResponse.json({ ok: true, suggestion })
  } catch (err) {
    const { status, error } = mapPromotionError(err)
    return NextResponse.json({ error }, { status })
  }
}
