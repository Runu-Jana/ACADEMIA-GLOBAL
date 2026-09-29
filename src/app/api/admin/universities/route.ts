import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, readJson } from '../_lib/guard'
import { universitySchema } from '../_lib/university-schema'
import { createPartnerLogin } from '@/lib/partner-invite'

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
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    },
    select: { id: true, slug: true, name: true },
  })

  // An ACTIVE partner with a contact email gets a portal login the same way an
  // approved sign-up does, so it can add its own programmes.
  let partnerInvite: { email: string; setupUrl: string; emailed: boolean } | null = null
  let partnerInviteError: string | null = null
  if (data.partnerStatus === 'ACTIVE' && data.contactEmail) {
    const invite = await createPartnerLogin({
      universityId: university.id,
      name: data.contactName ?? university.name,
      email: data.contactEmail,
      phone: data.contactPhone,
      universityName: university.name,
    })
    if (invite.ok) partnerInvite = { email: invite.email, setupUrl: invite.setupUrl, emailed: invite.emailed }
    else partnerInviteError = invite.error
  }

  return NextResponse.json({ ok: true, university, partnerInvite, partnerInviteError }, { status: 201 })
}
