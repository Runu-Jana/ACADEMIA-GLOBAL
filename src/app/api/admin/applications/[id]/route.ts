import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

/**
 * DRAFT and SUBMITTED are set by the applicant's own wizard — an admin only
 * moves an application forward through the review pipeline.
 */
const schema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Choose a valid review status' }),
  }),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const existing = await prisma.application.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!existing) return notFound('That application no longer exists.')

  if (existing.status === 'DRAFT') {
    return badRequest('This application is still a draft — the student has not submitted it yet.')
  }

  const application = await prisma.application.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  })

  return NextResponse.json({ ok: true, application })
}
