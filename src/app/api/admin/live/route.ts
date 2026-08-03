import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z.object({
  courseId: z.string().trim().min(1, 'Choose a course'),
  subjectId: z.string().trim().optional(),
  title: z.string().trim().min(2, 'Give the class a title').max(140),
  description: z.string().trim().max(500).optional(),
  provider: z.enum(['JITSI', 'ZOOM', 'MEET']).default('JITSI'),
  externalUrl: z.string().trim().url('Enter a valid meeting URL').max(500).optional().or(z.literal('')),
  startsAt: z.string().trim().min(1, 'Pick a date and time'),
  durationMin: z.coerce.number().int().min(10).max(600).default(60),
})

/**
 * Schedules a live class for a course. The roomName carries a random suffix and
 * is the access control on the video side — it's minted here and never sent to
 * the browser directly (see /api/live/[id]/join).
 */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const d = parsed.data

  const startsAt = new Date(d.startsAt)
  if (Number.isNaN(startsAt.getTime())) return badRequest('That start time is not a valid date.')

  const course = await prisma.course.findUnique({ where: { id: d.courseId }, select: { id: true, slug: true } })
  if (!course) return badRequest('That course no longer exists.')

  if (d.subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: d.subjectId, courseId: course.id },
      select: { id: true },
    })
    if (!subject) return badRequest('That subject does not belong to this course.')
  }

  const created = await prisma.liveClass.create({
    data: {
      title: d.title,
      description: d.description || null,
      provider: d.provider,
      externalUrl: d.externalUrl || null,
      roomName: `ag-${course.slug.slice(0, 20)}-${randomBytes(6).toString('hex')}`,
      startsAt,
      durationMin: d.durationMin,
      status: 'SCHEDULED',
      courseId: course.id,
      subjectId: d.subjectId || null,
      hostId: user.id,
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}
