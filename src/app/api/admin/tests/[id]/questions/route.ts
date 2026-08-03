import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    text: z.string().trim().min(1, 'Enter the question').max(1000),
    options: z.array(z.string().trim().min(1).max(300)).min(2, 'At least two options').max(6),
    correctIndex: z.coerce.number().int().min(0),
    marks: z.coerce.number().int().min(1).max(50).default(1),
  })
  .refine((d) => d.correctIndex < d.options.length, {
    message: 'The correct answer must be one of the options',
    path: ['correctIndex'],
  })

/** Adds a question to a test. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id: testId } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true } })
  if (!test) return notFound('That test no longer exists.')

  const last = await prisma.question.findFirst({
    where: { testId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const created = await prisma.question.create({
    data: {
      testId,
      text: d.text,
      options: d.options,
      correctIndex: d.correctIndex,
      marks: d.marks,
      order: (last?.order ?? -1) + 1,
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}
