import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './config'

/**
 * Resolves the active locale per request from the NEXT_LOCALE cookie (falling
 * back to English) and loads that locale's messages. next-intl calls this on
 * every server render, so server components get translations for free and the
 * root layout hands the same messages to the client provider.
 */
export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get(LOCALE_COOKIE)?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
