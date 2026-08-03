import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    moduleId: z.string().trim().min(1, 'Choose a module'),
    title: z.string().trim().min(2, 'Give the test a title').max(140),
    type: z.enum(['QUIZ', 'MID_TERM', 'FINAL']).default('QUIZ'),
    totalMarks: z.coerce.number().int().min(1).max(500).default(20),
    passMarks: z.coerce.number().int().min(0).max(500).default(8),
    durationMin: z.coerce.number().int().min(5).max(240).default(20),
  })
  .refine((d) => d.passMarks <= d.totalMarks, {
    message: 'Pass marks cannot exceed total marks',
    path: ['passMarks'],
  })

/** Creates a test under a module. Questions are added afterwards on the test page. */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const mod = await prisma.module.findUnique({ where: { id: d.moduleId }, select: { id: true } })
  if (!mod) return badRequest('That module no longer exists.')

  const created = await prisma.test.create({
    data: {
      moduleId: d.moduleId,
      title: d.title,
      type: d.type,
      totalMarks: d.totalMarks,
      passMarks: d.passMarks,
      durationMin: d.durationMin,
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}
