import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActivePartnerApi } from '../../../_lib/guard'

export const dynamic = 'force-dynamic'

/**
 * Submits a draft (or a returned, since-fixed) programme for operator review.
 * Moves it to PENDING — where it's invisible to students but visible in the
 * operator's review queue.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, universityId, response } = await requireActivePartnerApi()
  if (!user) return response

  const { id } = await params
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, universityId: true, reviewStatus: true, title: true },
  })
  if (!course || course.universityId !== universityId) {
    return NextResponse.json({ error: 'Programme not found' }, { status: 404 })
  }

  if (course.reviewStatus !== 'DRAFT' && course.reviewStatus !== 'REJECTED') {
    return NextResponse.json(
      { error: 'This programme has already been submitted.' },
      { status: 400 },
    )
  }

  await prisma.course.update({
    where: { id },
    data: {
      reviewStatus: 'PENDING',
      submittedAt: new Date(),
      submittedById: user.id,
      // Clear any prior rejection note now that it's a fresh submission.
      reviewNote: null,
    },
  })

  return NextResponse.json({ ok: true, status: 'PENDING' })
}
