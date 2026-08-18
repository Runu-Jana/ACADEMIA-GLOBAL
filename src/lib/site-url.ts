/**
 * The canonical public base URL, in one place.
 *
 * Two names were in circulation — NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL —
 * so half the app built absolute links from one and half from the other, and a
 * deploy that set only the documented name silently fell back to localhost in
 * the sitemap, the JSON-LD and every transactional email. Both names are still
 * honoured so an existing deployment keeps working; NEXT_PUBLIC_SITE_URL is the
 * documented one and wins.
 *
 * These reads are static on purpose: Next inlines NEXT_PUBLIC_* at build time
 * only when referenced literally.
 */

/** What the environment actually set, or null. Trailing slashes stripped. */
export const SITE_URL_FROM_ENV: string | null =
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '') || null

/** The base URL to build absolute links from. Falls back to local dev. */
export const SITE_URL: string = SITE_URL_FROM_ENV ?? 'http://localhost:3000'

/** Absolute URL for a site-relative path. */
export const abs = (path = '/'): string => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
