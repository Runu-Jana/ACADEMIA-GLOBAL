import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSession, verifyPassword } from '@/lib/auth'
import type { Role } from '@/lib/session'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

export async function POST(req: Request) {
  // Blunt the brute-force / credential-stuffing surface.
  const limited = enforceRateLimit(req, 'login', 10, 10 * MINUTE)
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

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  // Same message for unknown-email and wrong-password so the endpoint can't be
  // used to enumerate which addresses are registered.
  const invalid = NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
  if (!user) return invalid
  if (!(await verifyPassword(password, user.passwordHash))) return invalid

  await createSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
  })

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}
