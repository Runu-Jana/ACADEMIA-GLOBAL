import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { LESSON_TYPES } from '@/lib/constants'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../_lib/guard'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  moduleId: z.string().trim().min(1, 'Missing module'),
  title: z.string().trim().min(2, 'Lesson title must be at least 2 characters').max(160),
  type: z.enum(LESSON_TYPES).default('VIDEO'),
  durationMin: z.coerce.number().int().min(1, 'Duration must be at least 1 minute').max(600).default(15),
  description: z.string().trim().max(500).optional(),
  contentUrl: z.string().trim().max(500).optional(),
})

export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = createSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const { moduleId, title, type, durationMin } = parsed.data

  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true } })
  if (!mod) return badRequest('That module no longer exists.')

  const last = await prisma.lesson.findFirst({
    where: { moduleId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title,
      type,
      durationMin,
      description: parsed.data.description || null,
      contentUrl: parsed.data.contentUrl || null,
      order: (last?.order ?? -1) + 1,
    },
    select: { id: true, title: true, type: true, durationMin: true, order: true },
  })

  return NextResponse.json({ ok: true, lesson }, { status: 201 })
}

const reorderSchema = z.object({
  moduleId: z.string().trim().min(1),
  ids: z.array(z.string().trim().min(1)).min(1, 'Nothing to reorder'),
})

/** PATCH /api/admin/lessons — persists a new lesson order within one module. */
export async function PATCH(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = reorderSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const { moduleId, ids } = parsed.data

  const owned = await prisma.lesson.findMany({
    where: { moduleId, id: { in: ids } },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((l) => l.id))

  await prisma.$transaction(
    ids
      .filter((id) => ownedIds.has(id))
      .map((id, index) => prisma.lesson.update({ where: { id }, data: { order: index } })),
  )

  return NextResponse.json({ ok: true })
}
