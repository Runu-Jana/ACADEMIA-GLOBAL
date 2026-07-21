'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIONS = [
  { value: 'UNDER_REVIEW', label: 'Review', icon: Eye, active: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300', hover: 'hover:border-amber-300 hover:text-amber-600' },
  { value: 'APPROVED', label: 'Approve', icon: Check, active: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300', hover: 'hover:border-emerald-300 hover:text-emerald-600' },
  { value: 'REJECTED', label: 'Reject', icon: X, active: 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300', hover: 'hover:border-red-300 hover:text-red-600' },
] as const

/**
 * Moves one application through the review pipeline. The route re-verifies the
 * admin session, so this control is convenience only — never authorisation.
 */
export function ApplicationStatusControl({
  applicationId,
  status,
  applicantName,
  disabled,
}: {
  applicationId: string
  status: string
  applicantName: string
  /** DRAFT applications are the student's to finish, not ours to review. */
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState('')

  async function setStatus(next: string) {
    if (next === status || pending) return

    setError('')
    setPending(next)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not update that application.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setPending(null)
    }
  }

  if (disabled) {
    return <span className="text-[11.5px] text-muted-foreground">Awaiting submission</span>
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span
        role="group"
        aria-label={`Review status for ${applicantName}`}
        className="flex items-center gap-1"
      >
        {ACTIONS.map((a) => {
          const isCurrent = a.value === status
          const isPending = pending === a.value
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => setStatus(a.value)}
              disabled={isCurrent || pending !== null}
              aria-pressed={isCurrent}
              title={`${a.label} — ${applicantName}`}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition-colors',
                isCurrent
                  ? cn(a.active, 'cursor-default')
                  : cn('border-border text-muted-foreground', a.hover),
                pending !== null && !isPending && 'opacity-50',
              )}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <a.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          )
        })}
      </span>

      {error && (
        <span role="alert" className="text-[11px] font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </span>
  )
}
