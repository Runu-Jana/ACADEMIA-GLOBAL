import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * Re-verifies a partner session inside a route handler.
 *
 * Like the admin guard, this never trusts the client about who it is. Two tiers:
 * any PARTNER may read their own dashboard, but only an *approved* partner (one
 * linked to a university) may write — a pending sign-up can browse but can't
 * publish.
 */
export async function requirePartnerApi() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'You are not signed in.' }, { status: 401 }),
    } as const
  }
  if (user.role !== 'PARTNER') {
    return {
      user: null,
      response: NextResponse.json({ error: 'Partner access is required.' }, { status: 403 }),
    } as const
  }

  return { user, response: null } as const
}

/**
 * A partner who has been approved and attached to a university. Every write in
 * the portal goes through this, so a still-pending sign-up gets a clear message
 * rather than a confusing failure deeper in the handler.
 */
export async function requireActivePartnerApi() {
  const { user, response } = await requirePartnerApi()
  if (!user) return { user: null, universityId: null, response } as const

  if (!user.universityId) {
    return {
      user: null,
      universityId: null,
      response: NextResponse.json(
        { error: 'Your partnership is still under review. You can add programmes once it is approved.' },
        { status: 403 },
      ),
    } as const
  }

  return { user, universityId: user.universityId, response: null } as const
}
