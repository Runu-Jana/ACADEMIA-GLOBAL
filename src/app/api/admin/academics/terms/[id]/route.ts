import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, notFound } from '../../../_lib/guard'

export const dynamic = 'force-dynamic'

/** Deletes a term. Its subjects lose their term link (SetNull) but survive. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const term = await prisma.term.findUnique({ where: { id }, select: { id: true } })
  if (!term) return notFound('That semester no longer exists.')

  await prisma.term.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
