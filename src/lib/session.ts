import { SignJWT, jwtVerify } from 'jose'
import { SESSION_MAX_AGE } from './constants'

/**
 * Edge-safe session token helpers. Deliberately free of Prisma/bcrypt imports
 * so `middleware.ts` can use them without dragging Node-only code into the
 * edge bundle.
 */

export type Role = 'STUDENT' | 'ADMIN'

export interface SessionPayload {
  userId: string
  role: Role
  name: string
  email: string
}

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
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
