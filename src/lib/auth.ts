import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { SESSION_COOKIE, SESSION_MAX_AGE } from './constants'
import { signSessionToken, verifySessionToken, type SessionPayload } from './session'

export type { SessionPayload }

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

/** Full user record for the signed-in session, or null. */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      city: true,
      state: true,
      dob: true,
      gender: true,
      createdAt: true,
      // Set only for PARTNER users; null means a partner sign-up still awaiting
      // approval. Student/admin accounts always carry null here.
      universityId: true,
    },
  })
}

export async function requireUser(returnTo = '/dashboard') {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  return user
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin')
  if (user.role !== 'ADMIN') redirect('/dashboard')
  return user
}

/** Home a signed-in user according to their role. Used after login and to bounce
 *  users out of areas that aren't theirs. */
export function homeForRole(role: string): string {
  if (role === 'ADMIN') return '/admin'
  if (role === 'PARTNER') return '/partner'
  return '/dashboard'
}

/**
 * Gate for the partner portal.
 *
 * A PARTNER whose universityId is still null is a pending sign-up — allowed in,
 * but the portal shows them an "under review" state rather than the editor.
 * Non-partners are sent to their own home.
 */
export async function requirePartner(returnTo = '/partner') {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  if (user.role !== 'PARTNER') redirect(homeForRole(user.role))
  return user
}
