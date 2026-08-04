import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z.object({ revoked: z.boolean() })

/** Revokes or restores a certificate. A revoked serial fails public verification. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const cert = await prisma.certificate.findUnique({ where: { id }, select: { id: true } })
  if (!cert) return notFound('That certificate no longer exists.')

  await prisma.certificate.update({
    where: { id },
    data: { revoked: parsed.data.revoked, revokedAt: parsed.data.revoked ? new Date() : null },
  })
  return NextResponse.json({ ok: true })
}
