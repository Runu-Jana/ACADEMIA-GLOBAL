import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { LESSON_TYPES } from '@/lib/constants'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  title: z.string().trim().min(2, 'Lesson title must be at least 2 characters').max(160).optional(),
  type: z.enum(LESSON_TYPES).optional(),
  durationMin: z.coerce.number().int().min(1).max(600).optional(),
  description: z.string().trim().max(500).optional(),
  contentUrl: z.string().trim().max(500).optional(),
  transcript: z.string().trim().max(50000).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = updateSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const existing = await prisma.lesson.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That lesson no longer exists.')

  const { title, type, durationMin, description, contentUrl, transcript } = parsed.data

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(durationMin !== undefined && { durationMin }),
      ...(description !== undefined && { description: description || null }),
      ...(contentUrl !== undefined && { contentUrl: contentUrl || null }),
      ...(transcript !== undefined && { transcript: transcript || null }),
    },
    select: { id: true, title: true, type: true, durationMin: true, order: true },
  })

  return NextResponse.json({ ok: true, lesson })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params

  const existing = await prisma.lesson.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That lesson no longer exists.')

  await prisma.lesson.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
