'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

/**
 * Sets the weekly learning target. Optimistic: the picked value highlights
 * immediately, then `router.refresh()` re-runs the server component so the ring
 * and "goal met" state reflect the new target.
 */
export function GoalSetter({ target }: { target: number }) {
  const router = useRouter()
  const [value, setValue] = React.useState(target)
  const [saving, setSaving] = React.useState<number | null>(null)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => setValue(target), [target])

  async function choose(days: number) {
    if (days === value || saving !== null) return
    const prev = value
    setValue(days)
    setSaving(days)
    setSaved(false)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyDays: days }),
      })
      if (!res.ok) throw new Error('save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
      router.refresh()
    } catch {
      setValue(prev) // revert on failure
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-muted-foreground">Days per week</p>
        {saved && (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>
      <div role="group" aria-label="Weekly learning goal (days per week)" className="mt-2 grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => {
          const active = d === value
          const isSaving = saving === d
          return (
            <button
              key={d}
              type="button"
              onClick={() => choose(d)}
              aria-pressed={active}
              disabled={saving !== null}
              className={cn(
                'grid h-10 place-items-center rounded-lg border text-[13px] font-bold tabular-nums transition-colors disabled:opacity-60',
                active
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-border text-muted-foreground hover:border-primary-300 hover:text-primary-600',
              )}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
