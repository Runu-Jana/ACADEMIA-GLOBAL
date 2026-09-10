'use client'

import * as React from 'react'
import { IndianRupee, CalendarClock } from 'lucide-react'
import { cn, formatINR } from '@/lib/utils'

const TENURES = [3, 6, 9, 12] as const
const MIN_FEE = 1000
const MAX_FEE = 10_00_000 // ₹10 lakh

/**
 * A no-cost EMI estimator for the pricing page. Splits a fee evenly across the
 * chosen tenure — no interest, matching the "no-cost EMI" the platform offers —
 * so the monthly figure is simply fee / months and the total equals the fee.
 */
export function EmiCalculator() {
  const [fee, setFee] = React.useState(45000)
  const [months, setMonths] = React.useState<(typeof TENURES)[number]>(12)

  const clamped = Math.min(MAX_FEE, Math.max(0, fee))
  const monthly = clamped > 0 ? Math.round(clamped / months) : 0

  return (
    <div className="card-base holo-ring mx-auto max-w-2xl p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="emi-fee" className="mb-1.5 block text-[13px] font-semibold">
            Programme fee
          </label>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="emi-fee"
              type="number"
              inputMode="numeric"
              value={fee}
              min={0}
              max={MAX_FEE}
              step={1000}
              onChange={(e) => setFee(Math.round(Number(e.target.value) || 0))}
              className="h-11 w-full rounded-xl border border-input bg-surface pl-9 pr-3.5 text-sm tabular-nums shadow-sm outline-none transition-all focus:border-primary-400 focus:ring-4 focus:ring-primary-500/12"
            />
          </div>
          <input
            type="range"
            aria-label="Programme fee"
            min={MIN_FEE}
            max={200000}
            step={1000}
            value={Math.min(200000, Math.max(MIN_FEE, clamped))}
            onChange={(e) => setFee(Number(e.target.value))}
            className="mt-3 w-full accent-primary-600"
          />

          <p className="mb-1.5 mt-5 block text-[13px] font-semibold">Tenure</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TENURES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMonths(t)}
                aria-pressed={months === t}
                className={cn(
                  'grid h-10 place-items-center rounded-lg border text-[13px] font-bold tabular-nums transition-colors',
                  months === t
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-border text-muted-foreground hover:border-primary-300 hover:text-primary-600',
                )}
              >
                {t}m
              </button>
            ))}
          </div>
        </div>

        <div className="grid place-items-center rounded-2xl bg-muted/40 p-5 text-center">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Monthly EMI
          </span>
          <p className="mt-1.5 font-display text-4xl font-extrabold tracking-tight text-primary-700 dark:text-primary-300">
            {formatINR(monthly)}
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            × {months} months
          </p>
          <p className="mt-3 rounded-full bg-emerald-50 px-3 py-1 text-[11.5px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            No-cost EMI · total {formatINR(clamped)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
        Indicative, interest-free estimate. Final plans and eligibility are set by our partner lenders at checkout.
      </p>
    </div>
  )
}
