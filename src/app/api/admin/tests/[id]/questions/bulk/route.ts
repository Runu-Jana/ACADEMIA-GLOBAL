import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../../_lib/guard'

export const dynamic = 'force-dynamic'

/** Same per-question shape the single-add endpoint enforces, in a batch. */
const questionSchema = z
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

const schema = z.object({
  questions: z.array(questionSchema).min(1, 'Nothing to add').max(20),
})

/**
 * Appends several reviewed questions to a test in one shot.
 *
 * Used by the AI generator's review step, where a human has vetted a batch and
 * wants them all in. Ordering continues from the test's current last question,
 * and the insert is one query so a half-added batch can't happen.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id: testId } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true } })
  if (!test) return notFound('That test no longer exists.')

  const last = await prisma.question.findFirst({
    where: { testId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })
  const base = (last?.order ?? -1) + 1

  const created = await prisma.question.createMany({
    data: parsed.data.questions.map((q, i) => ({
      testId,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      marks: q.marks,
      order: base + i,
    })),
  })

  return NextResponse.json({ ok: true, added: created.count }, { status: 201 })
}
