import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    text: z.string().trim().min(1).max(1000).optional(),
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6).optional(),
    correctIndex: z.coerce.number().int().min(0).optional(),
    marks: z.coerce.number().int().min(1).max(50).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const existing = await prisma.question.findUnique({
    where: { id },
    select: { options: true, correctIndex: true },
  })
  if (!existing) return notFound('That question no longer exists.')

  // Keep the correct index inside the (possibly new) options list.
  const options = d.options ?? (existing.options as string[])
  const correctIndex = d.correctIndex ?? existing.correctIndex
  if (correctIndex >= options.length) {
    return badRequest('The correct answer must be one of the options.')
  }

  await prisma.question.update({
    where: { id },
    data: {
      ...(d.text !== undefined && { text: d.text }),
      ...(d.options !== undefined && { options: d.options }),
      ...(d.correctIndex !== undefined && { correctIndex: d.correctIndex }),
      ...(d.marks !== undefined && { marks: d.marks }),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const existing = await prisma.question.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That question no longer exists.')

  await prisma.question.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
