import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    title: z.string().trim().min(2).max(140).optional(),
    credits: z.coerce.number().int().min(1).max(20).optional(),
    kind: z.enum(['CORE', 'ELECTIVE', 'LAB', 'PROJECT', 'AUDIT']).optional(),
    internalMarks: z.coerce.number().int().min(0).max(100).optional(),
    externalMarks: z.coerce.number().int().min(0).max(100).optional(),
    termId: z.string().trim().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const subject = await prisma.subject.findUnique({ where: { id }, select: { courseId: true } })
  if (!subject) return notFound('That subject no longer exists.')

  if (d.termId) {
    const term = await prisma.term.findFirst({ where: { id: d.termId, courseId: subject.courseId }, select: { id: true } })
    if (!term) return badRequest('That semester does not belong to this course.')
  }

  await prisma.subject.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.credits !== undefined && { credits: d.credits }),
      ...(d.kind !== undefined && { kind: d.kind }),
      ...(d.internalMarks !== undefined && { internalMarks: d.internalMarks }),
      ...(d.externalMarks !== undefined && { externalMarks: d.externalMarks }),
      ...(d.termId !== undefined && { termId: d.termId }),
    },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const subject = await prisma.subject.findUnique({ where: { id }, select: { id: true } })
  if (!subject) return notFound('That subject no longer exists.')

  // Results reference the subject by a soft id, so clear them to avoid orphans.
  await prisma.subjectResult.deleteMany({ where: { subjectId: id } })
  await prisma.subject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
