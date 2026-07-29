import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../_lib/guard'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Approves or rejects a public partner application.
 *
 * Approval is the moment a self-declared lead becomes a real institution: it
 * mints the University (ACTIVE, so its future published courses can go live) and
 * attaches the dormant PARTNER login raised at sign-up. Until then no University
 * exists for the applicant, which is what keeps the public directory clean.
 */
const schema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(1000).optional(),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
})

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name).slice(0, 70) || 'partner'
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? base : `${base}-${n + 1}`
    const clash = await prisma.university.findUnique({ where: { slug }, select: { id: true } })
    if (!clash) return slug
  }
  return `${base}-${Date.now()}`
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const app = await prisma.partnerApplication.findUnique({ where: { id } })
  if (!app) return notFound('That application no longer exists.')
  if (app.status !== 'PENDING') {
    return badRequest('This application has already been reviewed.')
  }

  if (parsed.data.action === 'reject') {
    await prisma.partnerApplication.update({
      where: { id },
      data: { status: 'REJECTED', reviewNote: parsed.data.note ?? null, reviewedAt: new Date() },
    })
    return NextResponse.json({ ok: true, status: 'REJECTED' })
  }

  // Approve: create the University and attach the partner login in one transaction.
  const slug = await uniqueSlug(app.universityName)
  const shortName = (app.universityName.split(/\s+/)[0] ?? app.universityName).slice(0, 24)

  const university = await prisma.$transaction(async (tx) => {
    const created = await tx.university.create({
      data: {
        slug,
        name: app.universityName,
        shortName,
        // A starter profile the operator can flesh out on the University page.
        about: app.message?.trim()
          ? app.message.trim()
          : `${app.universityName} is a partner institution on Academia Global.`,
        estYear: new Date().getFullYear(),
        approvals: [],
        city: app.city?.trim() || 'India',
        state: app.state?.trim() || '',
        website: app.website ?? null,
        contactName: app.contactName,
        contactEmail: app.contactEmail,
        contactPhone: app.contactPhone,
        // Approving the partnership activates it; individual programmes still
        // pass through review before students see them.
        partnerStatus: 'ACTIVE',
        commissionPct: parsed.data.commissionPct ?? 10,
      },
      select: { id: true, slug: true, name: true },
    })

    if (app.userId) {
      await tx.user.update({ where: { id: app.userId }, data: { universityId: created.id } })
    }

    await tx.partnerApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        universityId: created.id,
        reviewNote: parsed.data.note ?? null,
        reviewedAt: new Date(),
      },
    })

    return created
  })

  return NextResponse.json({ ok: true, status: 'APPROVED', university })
}
