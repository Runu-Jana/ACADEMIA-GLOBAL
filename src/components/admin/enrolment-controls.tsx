'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play, CheckCircle2, UserMinus } from 'lucide-react'

/** Operator control over one enrolment: pause/resume, mark complete, or unenrol. */
export function EnrolmentControls({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function patch(next: string) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/enrolments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        setError('Failed')
        return
      }
      router.refresh()
    } catch {
      setError('Network')
    } finally {
      setBusy(false)
    }
  }

  async function unenrol() {
    if (!window.confirm('Unenrol this student? Their enrolment and any certificate are removed.')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/enrolments/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else setError('Failed')
    } catch {
      setError('Network')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="mr-1 text-[10px] font-medium text-red-600">{error}</span>}

      {status === 'PAUSED' ? (
        <IconBtn label="Resume" onClick={() => patch('ACTIVE')} disabled={busy}>
          <Play className="h-3.5 w-3.5" />
        </IconBtn>
      ) : status === 'ACTIVE' ? (
        <IconBtn label="Pause" onClick={() => patch('PAUSED')} disabled={busy}>
          <Pause className="h-3.5 w-3.5" />
        </IconBtn>
      ) : null}

      {status !== 'COMPLETED' && (
        <IconBtn label="Mark complete" onClick={() => patch('COMPLETED')} disabled={busy} tone="emerald">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </IconBtn>
      )}

      <IconBtn label="Unenrol" onClick={unenrol} disabled={busy} tone="red">
        <UserMinus className="h-3.5 w-3.5" />
      </IconBtn>
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'emerald' | 'red'
  children: React.ReactNode
}) {
  const hover =
    tone === 'red'
      ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
      : tone === 'emerald'
        ? 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10'
        : 'hover:bg-muted hover:text-primary-600'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors disabled:opacity-50 ${hover}`}
    >
      {children}
    </button>
  )
}
