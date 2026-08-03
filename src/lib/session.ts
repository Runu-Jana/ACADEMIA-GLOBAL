import { SignJWT, jwtVerify } from 'jose'
import { SESSION_MAX_AGE } from './constants'

/**
 * Edge-safe session token helpers. Deliberately free of Prisma/bcrypt imports
 * so `middleware.ts` can use them without dragging Node-only code into the
 * edge bundle.
 */

export type Role = 'STUDENT' | 'ADMIN' | 'PARTNER'

export interface SessionPayload {
  userId: string
  role: Role
  name: string
  email: string
}

// The values shipped in .env / .env.example for local dev. If any of these — or
// a too-short secret — is still in use in production, sessions are forgeable, so
// we refuse to sign/verify rather than boot insecure.
const INSECURE_SECRETS = new Set([
  'change-me-to-a-long-random-string',
  'academia-global-dev-secret-change-me-in-production-0192837465',
])

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  if (
    process.env.NODE_ENV === 'production' &&
    (INSECURE_SECRETS.has(secret) || secret.length < 32)
  ) {
    throw new Error(
      'AUTH_SECRET is a default or too-short value in production. Set a long, random secret.',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    if (typeof payload.userId !== 'string' || typeof payload.role !== 'string') return null
    return {
      userId: payload.userId,
      role: payload.role as Role,
      name: String(payload.name ?? ''),
      email: String(payload.email ?? ''),
    }
  } catch {
    // Expired, tampered, or malformed — treat all as signed-out.
    return null
  }
}
