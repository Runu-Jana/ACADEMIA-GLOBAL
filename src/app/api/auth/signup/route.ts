import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSession, hashPassword } from '@/lib/auth'
import { enforceRateLimit, HOUR } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,17}$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal('')),
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

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Try signing in.' },
      { status: 409 },
    )
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
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

  return NextResponse.json({ ok: true, user })
}
