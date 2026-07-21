import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../_lib/guard'

export const dynamic = 'force-dynamic'

/** GET /api/admin/modules?courseId=… — powers the dependent Module dropdown. */
export async function GET(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const courseId = new URL(req.url).searchParams.get('courseId')?.trim()
  if (!courseId) return NextResponse.json({ modules: [] })

  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, order: true },
  })

  return NextResponse.json({ modules })
}

const createSchema = z.object({
  courseId: z.string().trim().min(1, 'Missing course'),
  title: z.string().trim().min(2, 'Module title must be at least 2 characters').max(140),
  description: z.string().trim().max(500).optional(),
})

export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = createSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const { courseId, title } = parsed.data

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) return badRequest('That course no longer exists.')

  const last = await prisma.module.findFirst({
    where: { courseId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const created = await prisma.module.create({
    data: {
      courseId,
      title,
      description: parsed.data.description || null,
      order: (last?.order ?? -1) + 1,
    },
    select: { id: true, title: true, description: true, order: true },
  })

  return NextResponse.json({ ok: true, module: { ...created, lessons: [] } }, { status: 201 })
}

const reorderSchema = z.object({
  courseId: z.string().trim().min(1),
  ids: z.array(z.string().trim().min(1)).min(1, 'Nothing to reorder'),
})

/** PATCH /api/admin/modules — persists a new module order for one course. */
export async function PATCH(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = reorderSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const { courseId, ids } = parsed.data

  // Only reorder rows that actually belong to this course.
  const owned = await prisma.module.findMany({
    where: { courseId, id: { in: ids } },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((m) => m.id))

  await prisma.$transaction(
    ids
      .filter((id) => ownedIds.has(id))
      .map((id, index) => prisma.module.update({ where: { id }, data: { order: index } })),
  )

  return NextResponse.json({ ok: true })
}
