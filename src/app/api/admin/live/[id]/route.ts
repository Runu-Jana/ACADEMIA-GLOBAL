import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z
  .object({
    title: z.string().trim().min(2).max(140).optional(),
    description: z.string().trim().max(500).optional(),
    startsAt: z.string().trim().optional(),
    durationMin: z.coerce.number().int().min(10).max(600).optional(),
    status: z.enum(['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED']).optional(),
    recordingUrl: z.string().trim().max(500).optional(),
    externalUrl: z.string().trim().max(500).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' })

/** Works a scheduled class: edit its details, flip its status, or attach a recording. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const existing = await prisma.liveClass.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That class no longer exists.')

  let startsAt: Date | undefined
  if (d.startsAt) {
    startsAt = new Date(d.startsAt)
    if (Number.isNaN(startsAt.getTime())) return badRequest('That start time is not a valid date.')
  }

  await prisma.liveClass.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description || null }),
      ...(startsAt && { startsAt }),
      ...(d.durationMin !== undefined && { durationMin: d.durationMin }),
      ...(d.status && { status: d.status }),
      ...(d.recordingUrl !== undefined && { recordingUrl: d.recordingUrl || null }),
      ...(d.externalUrl !== undefined && { externalUrl: d.externalUrl || null }),
    },
  })

  return NextResponse.json({ ok: true })
}

/** Removes a class (and its attendance rows, via cascade). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const existing = await prisma.liveClass.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That class no longer exists.')

  await prisma.liveClass.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
