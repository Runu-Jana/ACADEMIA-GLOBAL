import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../_lib/guard'
import { universitySchema } from '../../_lib/university-schema'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const existing = await prisma.university.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return notFound('That university no longer exists.')

  const parsed = universitySchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const data = parsed.data

  // Slug must stay unique across other universities.
  const clash = await prisma.university.findUnique({ where: { slug: data.slug }, select: { id: true } })
  if (clash && clash.id !== id) {
    return badRequest(`The slug “${data.slug}” is already used by another university.`)
  }

  const university = await prisma.university.update({
    where: { id },
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
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    },
    select: { id: true, slug: true, name: true },
  })

  return NextResponse.json({ ok: true, university })
}
