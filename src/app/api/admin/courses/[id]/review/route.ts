import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../_lib/guard'

export const dynamic = 'force-dynamic'

/**
 * Operator decision on a submitted programme.
 *
 *  approve -> PUBLISHED (live, provided the university is an ACTIVE partner)
 *  reject  -> REJECTED, with a note the partner sees and can act on.
 *
 * Only a PENDING programme can be decided — an operator can't publish something
 * a partner is still drafting or has never submitted.
 */
const schema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(1000).optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, reviewStatus: true, title: true },
  })
  if (!course) return notFound('That programme no longer exists.')
  if (course.reviewStatus !== 'PENDING') {
    return badRequest('Only programmes awaiting review can be approved or rejected.')
  }

  if (parsed.data.action === 'reject') {
    await prisma.course.update({
      where: { id },
      data: { reviewStatus: 'REJECTED', reviewNote: parsed.data.note ?? null },
    })
    return NextResponse.json({ ok: true, status: 'REJECTED' })
  }

  await prisma.course.update({
    where: { id },
    // Clear the note on publish so a stale rejection reason can't linger.
    data: { reviewStatus: 'PUBLISHED', reviewNote: null },
  })
  return NextResponse.json({ ok: true, status: 'PUBLISHED' })
}
