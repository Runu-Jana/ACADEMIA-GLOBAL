/**
 * Phone handling for identity.
 *
 * Phones are the "is this a returning student?" signal (a person can have many
 * email addresses but usually one number), so they must be stored in one
 * canonical shape or "+91 98765 43210", "9876543210" and "09876543210" would
 * look like three different people. We normalise to E.164-ish "+91XXXXXXXXXX"
 * for Indian numbers and keep other "+" numbers as compacted digits.
 */

/** Digits only, preserving a leading "+". */
function compact(raw: string): string {
  const trimmed = raw.trim()
  const plus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return plus ? `+${digits}` : digits
}

/**
 * Returns a canonical phone, or null if it can't be a real number.
 * Indian 10-digit mobiles (optionally with 0 / 91 / +91 prefixes) → +91XXXXXXXXXX.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const c = compact(raw)
  const digits = c.replace(/^\+/, '')

  if (c.startsWith('+')) {
    // Already international. Accept 11–15 digits; canonicalise +91 form.
    if (digits.length < 8 || digits.length > 15) return null
    if (digits.startsWith('91') && digits.length === 12) return `+91${digits.slice(2)}`
    return `+${digits}`
  }

  // Bare digits — treat as Indian.
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('91')) return `+91${digits.slice(2)}`
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}` // last-resort passthrough

  return null
}

/** True when the raw input normalises to a usable number. */
export function isValidPhone(raw: string | null | undefined): boolean {
  return normalizePhone(raw) !== null
}
