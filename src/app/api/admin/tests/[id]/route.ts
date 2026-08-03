import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    title: z.string().trim().min(2).max(140).optional(),
    type: z.enum(['QUIZ', 'MID_TERM', 'FINAL']).optional(),
    totalMarks: z.coerce.number().int().min(1).max(500).optional(),
    passMarks: z.coerce.number().int().min(0).max(500).optional(),
    durationMin: z.coerce.number().int().min(5).max(240).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const test = await prisma.test.findUnique({ where: { id }, select: { totalMarks: true, passMarks: true } })
  if (!test) return notFound('That test no longer exists.')

  const total = d.totalMarks ?? test.totalMarks
  const pass = d.passMarks ?? test.passMarks
  if (pass > total) return badRequest('Pass marks cannot exceed total marks.')

  await prisma.test.update({ where: { id }, data: d })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const test = await prisma.test.findUnique({ where: { id }, select: { id: true } })
  if (!test) return notFound('That test no longer exists.')

  await prisma.test.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
