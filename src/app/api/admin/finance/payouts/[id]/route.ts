import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../_lib/guard'
import { markPayoutInvoiced, markPayoutPaid, disputePayout } from '@/lib/commission'

export const dynamic = 'force-dynamic'

const schema = z.object({
  action: z.enum(['invoice', 'paid', 'dispute']),
  invoiceNo: z.string().trim().max(60).optional(),
})

/** Advances a payout through its lifecycle: DRAFT → INVOICED → PAID (or DISPUTED). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const payout = await prisma.payout.findUnique({ where: { id }, select: { id: true } })
  if (!payout) return notFound('That payout no longer exists.')

  const { action, invoiceNo } = parsed.data
  if (action === 'invoice') await markPayoutInvoiced(id, invoiceNo)
  else if (action === 'paid') await markPayoutPaid(id)
  else await disputePayout(id)

  return NextResponse.json({ ok: true, status: action })
}
