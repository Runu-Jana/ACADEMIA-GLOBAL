import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../_lib/guard'
import { createPartnerLogin } from '@/lib/partner-invite'

export const dynamic = 'force-dynamic'

const schema = z.object({
  // Optional override; defaults to the university's stored contact email.
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(160).optional(),
  name: z.string().trim().max(80).optional(),
})

/**
 * Creates (or regenerates) the partner login for an existing university and
 * returns a set-password link the operator can share. Backfills portal access
 * for universities added manually or seeded without a partner account.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const university = await prisma.university.findUnique({
    where: { id },
    select: { id: true, name: true, contactName: true, contactEmail: true, contactPhone: true },
  })
  if (!university) return notFound('That university no longer exists.')

  const email = parsed.data.email ?? university.contactEmail
  if (!email) {
    return badRequest('Add a contact email for this university first, then create the partner login.')
  }

  const invite = await createPartnerLogin({
    universityId: university.id,
    name: parsed.data.name ?? university.contactName ?? university.name,
    email,
    phone: university.contactPhone,
    universityName: university.name,
  })
  if (!invite.ok) return badRequest(invite.error)

  // Persist the contact email if it was supplied as an override.
  if (parsed.data.email && parsed.data.email !== university.contactEmail) {
    await prisma.university.update({ where: { id }, data: { contactEmail: parsed.data.email } })
  }

  return NextResponse.json({
    ok: true,
    email: invite.email,
    setupUrl: invite.setupUrl,
    emailed: invite.emailed,
    reused: invite.reused,
  })
}
