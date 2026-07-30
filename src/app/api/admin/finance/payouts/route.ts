import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../../_lib/guard'
import { draftPayout } from '@/lib/commission'

export const dynamic = 'force-dynamic'

const schema = z.object({ universityId: z.string().trim().min(1, 'Choose a partner') })

/**
 * Drafts an invoice batching all of one partner's CLAIMABLE commissions.
 *
 * The window is open-ended (epoch → now): "invoice everything that's ready".
 * Returns 400 when nothing is claimable so the operator knows to run the
 * cool-off promotion first.
 */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const result = await draftPayout(parsed.data.universityId, new Date(0), new Date())
  if (!result) {
    return badRequest(
      'Nothing claimable to invoice for this partner yet. Run the cool-off promotion first.',
    )
  }

  return NextResponse.json({
    ok: true,
    payoutId: result.payout.id,
    count: result.count,
    totalAmount: result.totalAmount,
  })
}
