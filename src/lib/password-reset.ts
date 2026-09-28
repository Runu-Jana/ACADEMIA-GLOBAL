import { createHash, randomBytes } from 'crypto'

/**
 * Password-reset token helpers.
 *
 * The raw token is a 32-byte random hex string that travels only in the emailed
 * link. We persist only its SHA-256 hash, so the stored value is useless to an
 * attacker who reads the database: they'd still need the raw token from the email
 * to reset a password.
 */

/** How long a reset link stays valid. */
export const RESET_TOKEN_TTL_MIN = 60

/** Create a fresh token: the raw value for the email, the hash for the DB. */
export function createResetToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(32).toString('hex')
  return {
    raw,
    hash: hashResetToken(raw),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60_000),
  }
}

/** SHA-256 of a raw token, for storage and lookup. */
export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
