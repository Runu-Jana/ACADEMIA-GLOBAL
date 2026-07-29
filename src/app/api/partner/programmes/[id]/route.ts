import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActivePartnerApi } from '../../_lib/guard'
import { partnerCourseUpdateSchema } from '../../_lib/programme-schema'

export const dynamic = 'force-dynamic'

/** Loads a course only if it belongs to this partner — otherwise it's "not
 *  found", so a partner can't probe or touch another institution's catalogue. */
async function ownCourse(id: string, universityId: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, universityId: true, reviewStatus: true },
  })
  if (!course || course.universityId !== universityId) return null
  return course
}

/**
 * Editing rules by current state:
 *  - PUBLISHED  -> PENDING  (any change to a live listing needs re-approval)
 *  - REJECTED   -> DRAFT    (they're addressing feedback; resubmit when ready)
 *  - DRAFT/PENDING stay put.
 */
function statusOnEdit(current: string): { reviewStatus: string; submittedAt?: Date } {
  if (current === 'PUBLISHED') return { reviewStatus: 'PENDING', submittedAt: new Date() }
  if (current === 'REJECTED') return { reviewStatus: 'DRAFT' }
  return { reviewStatus: current }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, universityId, response } = await requireActivePartnerApi()
  if (!user) return response

  const { id } = await params
  const course = await ownCourse(id, universityId)
  if (!course) return NextResponse.json({ error: 'Programme not found' }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = partnerCourseUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Please check the details you entered.' },
      { status: 400 },
    )
  }

  // Only write the fields actually sent; never let an absent field blank a column.
  const clean = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  )
  const transition = statusOnEdit(course.reviewStatus)

  const updated = await prisma.course.update({
    where: { id },
    data: {
      ...clean,
      reviewStatus: transition.reviewStatus,
      ...(transition.submittedAt && { submittedAt: transition.submittedAt }),
    },
    select: { id: true, slug: true, title: true, reviewStatus: true },
  })

  return NextResponse.json({ ok: true, course: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, universityId, response } = await requireActivePartnerApi()
  if (!user) return response

  const { id } = await params
  const course = await ownCourse(id, universityId)
  if (!course) return NextResponse.json({ error: 'Programme not found' }, { status: 404 })

  // A live or in-review listing can't just vanish — only unsent work is deletable.
  if (course.reviewStatus !== 'DRAFT' && course.reviewStatus !== 'REJECTED') {
    return NextResponse.json(
      { error: 'Only drafts and returned programmes can be deleted.' },
      { status: 400 },
    )
  }

  await prisma.course.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
