import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { requireActivePartnerApi } from '../_lib/guard'
import { partnerCourseSchema } from '../_lib/programme-schema'

export const dynamic = 'force-dynamic'

/** Per-catalogue unique slug — two institutions can both have an "online-bba". */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 70) || 'programme'
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? base : `${base}-${n + 1}`
    const clash = await prisma.course.findUnique({ where: { slug }, select: { id: true } })
    if (!clash) return slug
  }
  return `${base}-${Date.now()}`
}

/**
 * Creates a new programme for the signed-in partner's university.
 *
 * Always born a DRAFT: the partner refines it and submits it for review, and it
 * reaches students only after an operator approves it. The university, source
 * and featured flag are forced here — never taken from the client.
 */
export async function POST(req: Request) {
  const { user, universityId, response } = await requireActivePartnerApi()
  if (!user) return response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = partnerCourseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Please check the details you entered.' },
      { status: 400 },
    )
  }

  const data = parsed.data
  const slug = await uniqueSlug(data.title)

  const course = await prisma.course.create({
    data: {
      ...data,
      slug,
      universityId,
      source: 'UNIVERSITY',
      featured: false,
      reviewStatus: 'DRAFT',
      submittedById: user.id,
    },
    select: { id: true, slug: true, title: true },
  })

  return NextResponse.json({ ok: true, course }, { status: 201 })
}
