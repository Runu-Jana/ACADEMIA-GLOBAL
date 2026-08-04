import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'
import { ENROLLMENT_STATUS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const schema = z.object({ status: z.enum(ENROLLMENT_STATUS) })

/** Pause / resume / complete an enrolment. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const enrolment = await prisma.enrollment.findUnique({ where: { id }, select: { id: true } })
  if (!enrolment) return notFound('That enrolment no longer exists.')

  await prisma.enrollment.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    },
  })
  return NextResponse.json({ ok: true })
}

/** Unenrol a student — removes the enrolment (and its certificate, via cascade). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const enrolment = await prisma.enrollment.findUnique({ where: { id }, select: { id: true } })
  if (!enrolment) return notFound('That enrolment no longer exists.')

  await prisma.enrollment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
