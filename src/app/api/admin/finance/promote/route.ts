import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../_lib/guard'
import { promoteClaimable } from '@/lib/commission'

export const dynamic = 'force-dynamic'

/**
 * Promotes every commission past its cool-off window to CLAIMABLE.
 *
 * Normally a scheduled job would do this; the button lets an operator run it on
 * demand before drafting invoices, so freshly-eligible commissions are included.
 */
export async function POST() {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { promoted } = await promoteClaimable()
  return NextResponse.json({ ok: true, promoted })
}
