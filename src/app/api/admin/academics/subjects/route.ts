import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z.object({
  courseId: z.string().trim().min(1),
  termId: z.string().trim().optional(),
  code: z.string().trim().min(2, 'Enter a subject code').max(30),
  title: z.string().trim().min(2, 'Enter the subject title').max(140),
  credits: z.coerce.number().int().min(1).max(20).default(4),
  kind: z.enum(['CORE', 'ELECTIVE', 'LAB', 'PROJECT', 'AUDIT']).default('CORE'),
  internalMarks: z.coerce.number().int().min(0).max(100).default(30),
  externalMarks: z.coerce.number().int().min(0).max(100).default(70),
})

export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const course = await prisma.course.findUnique({ where: { id: d.courseId }, select: { id: true } })
  if (!course) return badRequest('That course no longer exists.')

  if (d.termId) {
    const term = await prisma.term.findFirst({ where: { id: d.termId, courseId: d.courseId }, select: { id: true } })
    if (!term) return badRequest('That semester does not belong to this course.')
  }

  const clash = await prisma.subject.findFirst({
    where: { courseId: d.courseId, code: d.code },
    select: { id: true },
  })
  if (clash) return badRequest(`A subject with code "${d.code}" already exists in this course.`)

  const created = await prisma.subject.create({
    data: {
      courseId: d.courseId,
      termId: d.termId || null,
      code: d.code,
      title: d.title,
      credits: d.credits,
      kind: d.kind,
      internalMarks: d.internalMarks,
      externalMarks: d.externalMarks,
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}
