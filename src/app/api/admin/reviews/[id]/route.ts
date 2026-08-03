import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, notFound } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

/** Removes a learner review (moderation). Deleting it takes it off the course page. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const review = await prisma.review.findUnique({ where: { id }, select: { id: true } })
  if (!review) return notFound('That review no longer exists.')

  await prisma.review.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
