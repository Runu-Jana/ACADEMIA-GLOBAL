import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'
import { courseUpdateSchema } from '../../_lib/course-schema'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params

  const parsed = courseUpdateSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const existing = await prisma.course.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That course no longer exists.')

  const data = parsed.data

  if (data.universityId) {
    const university = await prisma.university.findUnique({
      where: { id: data.universityId },
      select: { id: true },
    })
    if (!university) return badRequest('That university no longer exists.')
  }

  if (data.slug) {
    const clash = await prisma.course.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    })
    if (clash && clash.id !== id) {
      return badRequest(`The slug “${data.slug}” is already used by another course.`)
    }
  }

  const course = await prisma.course.update({
    where: { id },
    // Only the keys the client actually sent are written — a partial edit form
    // must never blank out fields it didn't render.
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
      ...(data.universityId !== undefined && { universityId: data.universityId }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.mode !== undefined && { mode: data.mode }),
      ...(data.stream !== undefined && { stream: data.stream }),
      ...(data.durationYears !== undefined && { durationYears: data.durationYears }),
      ...(data.feePerYear !== undefined && { feePerYear: data.feePerYear }),
      ...(data.originalFee !== undefined && { originalFee: data.originalFee }),
      ...(data.discountPct !== undefined && { discountPct: data.discountPct }),
      ...(data.about !== undefined && { about: data.about }),
      ...(data.eligibility !== undefined && { eligibility: data.eligibility }),
      ...(data.examMode !== undefined && { examMode: data.examMode }),
      ...(data.highlights !== undefined && { highlights: data.highlights }),
      ...(data.skills !== undefined && { skills: data.skills }),
      ...(data.recruiters !== undefined && { recruiters: data.recruiters }),
      ...(data.isUgcEntitled !== undefined && { isUgcEntitled: data.isUgcEntitled }),
      ...(data.hasPlacement !== undefined && { hasPlacement: data.hasPlacement }),
      ...(data.hasLiveClass !== undefined && { hasLiveClass: data.hasLiveClass }),
      ...(data.featured !== undefined && { featured: data.featured }),
    },
    select: { id: true, slug: true, title: true },
  })

  return NextResponse.json({ ok: true, course })
}
