import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { passwordResetEmail } from '@/lib/emails'
import { createResetToken, RESET_TOKEN_TTL_MIN } from '@/lib/password-reset'
import { abs } from '@/lib/site-url'
import { enforceRateLimit, HOUR } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
})

/**
 * Starts the "forgot password" flow. Always responds the same way whether or not
 * the email is registered, so it can't be used to discover which addresses have
 * accounts. When the user exists, we mint a single-use expiring token, store only
 * its hash, and email the raw token as a link.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, 'forgot-password', 5, HOUR)
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

  const { email } = parsed.data
  const ok = NextResponse.json({ ok: true })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } })
  if (!user) return ok // don't reveal whether the address is registered

  // One active link at a time — clear any prior unused tokens for this user.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

  const { raw, hash, expiresAt } = createResetToken()
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt },
  })

  // Best-effort: sendEmail no-ops (returns { sent:false }) without RESEND_API_KEY
  // and never throws, so the response is identical regardless.
  await sendEmail(
    email,
    passwordResetEmail({
      name: user.name,
      resetUrl: abs(`/reset-password?token=${raw}`),
      expiresMinutes: RESET_TOKEN_TTL_MIN,
    }),
  )

  return ok
}
