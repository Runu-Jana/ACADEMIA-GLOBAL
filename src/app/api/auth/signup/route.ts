import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSession, hashPassword } from '@/lib/auth'
import { enforceRateLimit, HOUR } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/emails'
import { normalizePhone } from '@/lib/phone'

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  // Required: the phone is our "returning student" signal across email addresses.
  phone: z
    .string()
    .trim()
    .min(1, 'Enter your mobile number')
    .regex(/^[+\d][\d\s-]{7,17}$/, 'Enter a valid mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'signup', 5, HOUR)
  if (limited) return limited

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

  const { name, email, phone, password } = parsed.data
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'Enter a valid mobile number' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in.' },
      { status: 409 },
    )
  }

  // A person can have many emails but usually one number — if this phone is
  // already on a student account, they're a returning learner (we welcome them,
  // never block: multiple accounts are allowed).
  const priorAccount = await prisma.user.findFirst({
    where: { phone: normalizedPhone, role: 'STUDENT' },
    select: { id: true },
  })

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: normalizedPhone,
      passwordHash: await hashPassword(password),
      role: 'STUDENT',
    },
    select: { id: true, name: true, email: true, role: true },
  })

  await createSession({
    userId: user.id,
    role: 'STUDENT',
    name: user.name,
    email: user.email,
  })

  // Best-effort welcome (no-op when email isn't configured; never throws).
  await sendEmail(user.email, welcomeEmail(user.name))

  return NextResponse.json({ ok: true, user, returningStudent: Boolean(priorAccount) })
}
