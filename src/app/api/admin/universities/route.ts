import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../_lib/guard'
import { universitySchema } from '../_lib/university-schema'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = universitySchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const data = parsed.data

  const clash = await prisma.university.findUnique({ where: { slug: data.slug }, select: { id: true } })
  if (clash) return badRequest(`The slug “${data.slug}” is already used by another university.`)

  const university = await prisma.university.create({
    data: {
      name: data.name,
      slug: data.slug,
      shortName: data.shortName,
      about: data.about,
      estYear: data.estYear,
      naacGrade: data.naacGrade,
      approvals: data.approvals,
      highlights: data.highlights,
      rankings: data.rankings,
      rating: data.rating,
      reviews: data.reviews,
      students: data.students,
      programs: data.programs,
      city: data.city,
      state: data.state,
      website: data.website,
      featured: data.featured,
      listed: data.listed,
      partnerStatus: data.partnerStatus,
      commissionPct: data.commissionPct,
    },
    select: { id: true, slug: true, name: true },
  })

  return NextResponse.json({ ok: true, university }, { status: 201 })
}
