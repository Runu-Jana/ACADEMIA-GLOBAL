import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z.object({
  courseId: z.string().trim().min(1),
  title: z.string().trim().min(1, 'Name the semester').max(80),
  creditsRequired: z.coerce.number().int().min(0).max(400).default(0),
})

export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const course = await prisma.course.findUnique({ where: { id: d.courseId }, select: { id: true } })
  if (!course) return badRequest('That course no longer exists.')

  const last = await prisma.term.findFirst({
    where: { courseId: d.courseId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })

  const created = await prisma.term.create({
    data: {
      courseId: d.courseId,
      number: (last?.number ?? 0) + 1,
      title: d.title,
      creditsRequired: d.creditsRequired,
    },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}
