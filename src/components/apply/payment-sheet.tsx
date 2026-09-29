'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Smartphone, CreditCard, Landmark, Percent, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Method = 'upi' | 'card' | 'netbanking' | 'emi'

const METHODS: { id: Method; icon: React.ElementType; key: string }[] = [
  { id: 'upi', icon: Smartphone, key: 'methodUpi' },
  { id: 'card', icon: CreditCard, key: 'methodCard' },
  { id: 'netbanking', icon: Landmark, key: 'methodNetbanking' },
  { id: 'emi', icon: Percent, key: 'methodEmi' },
]

/**
 * In-app demonstration checkout, shown when no live gateway is configured.
 *
 * It deliberately collects NO card / UPI / bank details — it stands in for the
 * hosted Razorpay window so the payment interface is presentable, and clearly
 * labels itself as test mode. When real keys are added the wizard uses the real
 * Razorpay modal instead and this never renders.
 */
export function PaymentSheet({
  feeLabel,
  courseTitle,
  universityName,
  emiLabel,
  emiSelected,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  feeLabel: string
  courseTitle: string
  universityName: string
  emiLabel?: string
  emiSelected?: boolean
  loading: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useTranslations('apply.pay')
  const [method, setMethod] = React.useState<Method>('upi')

  // Lock body scroll + close on Escape while the sheet is open.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [loading, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        className="relative z-10 w-full max-w-md animate-fade-up rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-tight">{t('title')}</h3>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {t('testBadge')}
            </span>
          </div>
          <button
            type="button"
            aria-label={t('cancel')}
            onClick={() => !loading && onCancel()}
            disabled={loading}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* order summary */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t('orderSummary')}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{courseTitle}</p>
              <p className="truncate text-[12px] text-muted-foreground">{universityName}</p>
            </div>
            <p className="shrink-0 font-display text-xl font-extrabold">{feeLabel}</p>
          </div>
          {emiSelected && emiLabel && (
            <p className="mt-2 border-t border-border pt-2 text-[12px] text-muted-foreground">{emiLabel}</p>
          )}
        </div>

        {/* method picker (visual only in test mode) */}
        <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t('method')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon
            const active = method === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition-all',
                  active
                    ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-500/15 dark:bg-primary-500/10 dark:text-primary-300'
                    : 'border-border text-foreground hover:bg-muted/50',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(m.key)}
              </button>
            )
          })}
        </div>

        {/* demo notice */}
        <p className="mt-4 rounded-xl bg-muted/40 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          {t('demoNote')}
        </p>

        {error && (
          <p className="mt-3 text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button
          type="button"
          variant="primary"
          onClick={onConfirm}
          loading={loading}
          className="mt-4 w-full"
        >
          {loading ? t('processing') : t('pay', { fee: feeLabel })}
        </Button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('securedBy')}
        </p>
      </div>
    </div>
  )
}
