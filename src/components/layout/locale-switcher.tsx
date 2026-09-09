'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Languages, Check } from 'lucide-react'
import { LOCALES, LOCALE_LABELS, LOCALE_COOKIE, type Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

/**
 * Switches the UI language. The locale lives in a cookie, so choosing one writes
 * the cookie and refreshes: the server re-renders with the new locale (the
 * request config reads the cookie) and the client provider receives the new
 * messages, so both server- and client-rendered strings update together.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const router = useRouter()
  const active = useLocale() as Locale
  const t = useTranslations('language')
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
    setOpen(false)
    if (locale !== active) router.refresh()
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('switchTo')}
        aria-expanded={open}
        className="flex h-10 items-center gap-1.5 rounded-xl border border-border px-2.5 text-[12.5px] font-bold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
      >
        <Languages className="h-4 w-4" />
        <span className="uppercase">{active}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('label')}
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-40 animate-scale-in origin-top-right overflow-hidden rounded-xl border border-border bg-card shadow-lift"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === active}
              onClick={() => choose(l)}
              className={cn(
                'flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] font-semibold transition-colors hover:bg-muted',
                l === active ? 'text-primary-600 dark:text-primary-300' : 'text-foreground',
              )}
            >
              {LOCALE_LABELS[l]}
              {l === active && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
