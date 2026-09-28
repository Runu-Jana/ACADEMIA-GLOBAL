import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { hashResetToken } from '@/lib/password-reset'
import { enforceRateLimit, HOUR } from '@/lib/rate-limit'

const schema = z.object({
  token: z.string().trim().min(1, 'Missing reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

/**
 * Completes the reset: verifies the (hashed) token is real, unused and unexpired,
 * sets the new password, and burns the token + any siblings so the link can't be
 * replayed.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'reset-password', 10, HOUR)
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

  const { token, password } = parsed.data
  const invalid = NextResponse.json(
    { error: 'This reset link is invalid or has expired. Please request a new one.' },
    { status: 400 },
  )

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  })
  if (!record || record.usedAt || record.expiresAt < new Date()) return invalid

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding links for this user.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ])

  return NextResponse.json({ ok: true })
}
