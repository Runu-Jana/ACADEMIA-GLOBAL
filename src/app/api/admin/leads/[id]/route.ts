import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'
import { LEAD_STATUS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    status: z.enum(LEAD_STATUS).optional(),
    note: z.string().trim().max(1000).optional(),
    assignToMe: z.boolean().optional(),
  })
  .refine((d) => d.status || d.note || d.assignToMe, { message: 'Nothing to update' })

/** Works a lead: advance its status, assign it to the counsellor, and/or log a note. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } })
  if (!lead) return notFound('That lead no longer exists.')

  const { status, note, assignToMe } = parsed.data
  const ops: Prisma.PrismaPromise<unknown>[] = []

  if (status || assignToMe) {
    ops.push(
      prisma.lead.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(assignToMe && { assignedToId: user.id }),
        },
      }),
    )
  }
  if (note) {
    ops.push(prisma.leadNote.create({ data: { leadId: id, body: note, authorName: user.name } }))
  }
  // Auto-log status transitions so the timeline reads as a real history.
  if (status) {
    ops.push(
      prisma.leadNote.create({
        data: { leadId: id, body: `Status → ${status}`, authorName: user.name },
      }),
    )
  }

  await prisma.$transaction(ops)
  return NextResponse.json({ ok: true })
}
