import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi, badRequest, zodMessage, readJson } from '../../../_lib/guard'
import { resolveCatalogChange } from '@/lib/directory-sync'

export const dynamic = 'force-dynamic'

const schema = z.object({ action: z.enum(['approve', 'reject']) })

/** Approve (apply) or reject (dismiss) a queued catalogue change. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const res = await resolveCatalogChange(id, parsed.data.action)
  if (!res.ok) return badRequest('That change is no longer pending.')
  return NextResponse.json({ ok: true })
}
