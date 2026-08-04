import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../../_lib/guard'
import { gradeFor } from '@/lib/academics'

export const dynamic = 'force-dynamic'

const schema = z.object({
  userId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  internalScore: z.coerce.number().int().min(0).max(100),
  externalScore: z.coerce.number().int().min(0).max(100),
})

/**
 * Records/updates a student's result for one subject and publishes it. The grade
 * and grade points are computed from the total on the standard curve, so SGPA
 * (credit-weighted grade points) updates on the student's academics page.
 */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const subject = await prisma.subject.findUnique({
    where: { id: d.subjectId },
    select: { internalMarks: true, externalMarks: true },
  })
  if (!subject) return badRequest('That subject no longer exists.')
  if (d.internalScore > subject.internalMarks || d.externalScore > subject.externalMarks) {
    return badRequest(
      `Scores can't exceed the split (${subject.internalMarks} internal / ${subject.externalMarks} external).`,
    )
  }

  const total = d.internalScore + d.externalScore
  const { grade, gradePoints, passed } = gradeFor(total)

  await prisma.subjectResult.upsert({
    where: { userId_subjectId: { userId: d.userId, subjectId: d.subjectId } },
    create: {
      userId: d.userId,
      subjectId: d.subjectId,
      internalScore: d.internalScore,
      externalScore: d.externalScore,
      totalScore: total,
      grade,
      gradePoints,
      status: passed ? 'PASS' : 'FAIL',
      publishedAt: new Date(),
    },
    update: {
      internalScore: d.internalScore,
      externalScore: d.externalScore,
      totalScore: total,
      grade,
      gradePoints,
      status: passed ? 'PASS' : 'FAIL',
      publishedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, total, grade, gradePoints })
}
