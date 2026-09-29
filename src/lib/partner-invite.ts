import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { createResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/email'
import { partnerInviteEmail } from '@/lib/emails'
import { abs } from '@/lib/site-url'

/** A set-password invite link is long-lived so an operator can share it later. */
export const PARTNER_INVITE_TTL_DAYS = 7

export type PartnerInviteResult =
  | { ok: true; email: string; setupUrl: string; emailed: boolean; reused: boolean }
  | { ok: false; error: string }

/**
 * Creates (or re-invites) the PARTNER login for a university and returns a
 * set-password link.
 *
 * This is the single path that gives an institution portal access, used by both
 * the partner sign-up→approval flow and the admin's manual "add university" —
 * so a partner is provisioned the same way regardless of how the university got
 * onto the platform. The account is created with a random password it can never
 * be used to log in with; the partner sets a real one via the returned link
 * (also emailed, best-effort).
 */
export async function createPartnerLogin(opts: {
  universityId: string
  name: string
  email: string
  phone?: string | null
  universityName: string
}): Promise<PartnerInviteResult> {
  const email = opts.email.trim().toLowerCase()
  if (!email) return { ok: false, error: 'A contact email is required to create a partner login.' }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, universityId: true },
  })

  let userId: string
  let reused = false

  if (existing) {
    // Only reuse an account that is already this university's partner — never
    // repurpose a student or another partner's login.
    if (existing.role === 'PARTNER' && existing.universityId === opts.universityId) {
      userId = existing.id
      reused = true
    } else {
      return {
        ok: false,
        error: `The email ${email} is already used by another account. Use a different contact email.`,
      }
    }
  } else {
    const created = await prisma.user.create({
      data: {
        name: opts.name.trim() || opts.universityName,
        email,
        phone: opts.phone?.trim() || null,
        // Unusable until the partner sets one via the link below.
        passwordHash: await hashPassword(randomBytes(24).toString('hex')),
        role: 'PARTNER',
        universityId: opts.universityId,
      },
      select: { id: true },
    })
    userId = created.id
  }

  // One active invite at a time.
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } })

  const { raw, hash } = createResetToken()
  const expiresAt = new Date(Date.now() + PARTNER_INVITE_TTL_DAYS * 24 * 60 * 60_000)
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: hash, expiresAt } })

  const setupUrl = abs(`/reset-password?token=${raw}`)

  // Best-effort: no-ops without RESEND_API_KEY and never throws.
  const result = await sendEmail(
    email,
    partnerInviteEmail({
      name: opts.name,
      universityName: opts.universityName,
      setupUrl,
      expiresDays: PARTNER_INVITE_TTL_DAYS,
    }),
  )

  return { ok: true, email, setupUrl, emailed: Boolean(result?.sent), reused }
}
