/**
 * Locale configuration, kept free of server-only imports so both the request
 * config (server) and the language switcher (client) can share it.
 *
 * The locale is stored in a cookie rather than a URL segment for now — a full
 * /[locale]/ routing setup would mean moving every route under a [locale]
 * segment, composing next-intl's middleware with the existing auth middleware,
 * and swapping every <Link>. That's a deliberate follow-up; this gets the UI
 * translating today. Per-locale URLs (for SEO) come later.
 */

export const LOCALES = ['en', 'hi'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Cookie the request config reads and the switcher writes. */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

/** Names shown in the language switcher, in each language's own script. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
