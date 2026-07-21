import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  title: z.string().trim().min(2, 'Module title must be at least 2 characters').max(140).optional(),
  description: z.string().trim().max(500).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = updateSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const existing = await prisma.module.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That module no longer exists.')

  const updated = await prisma.module.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && {
        description: parsed.data.description || null,
      }),
    },
    select: { id: true, title: true, description: true, order: true },
  })

  return NextResponse.json({ ok: true, module: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params

  const existing = await prisma.module.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That module no longer exists.')

  // Lessons and tests cascade; material rows fall back to moduleId = null.
  await prisma.module.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
