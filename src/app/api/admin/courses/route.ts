import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../_lib/guard'
import { courseSchema } from '../_lib/course-schema'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = courseSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const data = parsed.data

  const university = await prisma.university.findUnique({
    where: { id: data.universityId },
    select: { id: true },
  })
  if (!university) return badRequest('That university no longer exists.')

  const clash = await prisma.course.findUnique({ where: { slug: data.slug }, select: { id: true } })
  if (clash) return badRequest(`The slug “${data.slug}” is already used by another course.`)

  const course = await prisma.course.create({
    data: {
      title: data.title,
      slug: data.slug,
      subtitle: data.subtitle,
      universityId: data.universityId,
      level: data.level,
      mode: data.mode,
      stream: data.stream,
      durationYears: data.durationYears,
      feePerYear: data.feePerYear,
      originalFee: data.originalFee,
      discountPct: data.discountPct,
      about: data.about,
      eligibility: data.eligibility,
      examMode: data.examMode,
      highlights: data.highlights,
      skills: data.skills,
      recruiters: data.recruiters,
      isUgcEntitled: data.isUgcEntitled,
      hasPlacement: data.hasPlacement,
      hasLiveClass: data.hasLiveClass,
      featured: data.featured,
    },
    select: { id: true, slug: true, title: true },
  })

  return NextResponse.json({ ok: true, course }, { status: 201 })
}
