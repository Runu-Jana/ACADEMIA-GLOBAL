import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSession, hashPassword } from '@/lib/auth'

/**
 * Public "Partner with us" sign-up.
 *
 * Creates a lead (PartnerApplication) plus a dormant PARTNER login with the
 * password the applicant chose. The login works immediately but can't publish
 * anything — it has no university until an operator approves the application.
 * Deliberately does NOT create a University: the public directory and course
 * tables must never fill with unvetted, self-declared institutions.
 */
const schema = z.object({
  universityName: z.string().trim().min(2, 'Enter your institution’s name').max(120),
  contactName: z.string().trim().min(2, 'Enter a contact name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,17}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  website: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  state: z.string().trim().max(60).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid details' },
      { status: 400 },
    )
  }

  const { universityName, contactName, email, phone, website, city, state, message, password } =
    parsed.data

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Sign in instead.' },
      { status: 409 },
    )
  }

  const user = await prisma.user.create({
    data: {
      name: contactName,
      email,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      role: 'PARTNER',
      // No university yet — that's what approval grants.
      universityId: null,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  await prisma.partnerApplication.create({
    data: {
      universityName,
      contactName,
      contactEmail: email,
      contactPhone: phone || null,
      website: website || null,
      city: city || null,
      state: state || null,
      message: message || null,
      userId: user.id,
    },
  })

  // Sign them straight in so they land in the portal's "under review" state.
  await createSession({ userId: user.id, role: 'PARTNER', name: user.name, email: user.email })

  return NextResponse.json({ ok: true, redirect: '/partner' })
}
