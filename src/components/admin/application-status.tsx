'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DECISIONS = [
  { value: 'APPROVED', label: 'Approve', icon: Check, active: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300', hover: 'hover:border-emerald-300 hover:text-emerald-600' },
  { value: 'REJECTED', label: 'Reject', icon: X, active: 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300', hover: 'hover:border-red-300 hover:text-red-600' },
] as const

type Detail = {
  status: string
  step: number
  personal: Record<string, unknown> | null
  education: Record<string, unknown> | null
  user: { name: string; email: string; phone: string | null }
  course: { title: string; university: { name: string } | null }
}

/**
 * Review one application: "Review" opens the submitted details, and the decision
 * buttons move it through the pipeline. The route re-verifies the admin session,
 * so this control is convenience only — never authorisation.
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
  const [open, setOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<Detail | null>(null)
  const [loading, setLoading] = React.useState(false)

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
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setPending(null)
    }
  }

  async function openReview() {
    setOpen(true)
    setError('')
    if (detail) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not load the application.')
        return
      }
      setDetail(data.application as Detail)
      // Opening a freshly-submitted application marks it "under review" (the old
      // Review button's job). Fire-and-forget so the modal opens instantly.
      if (status === 'SUBMITTED') {
        // No refresh here — that would re-mount this control and close the modal;
        // the row shows UNDER_REVIEW on the next navigation/refresh.
        fetch(`/api/admin/applications/${applicationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'UNDER_REVIEW' }),
        }).catch(() => {})
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (disabled) {
    return <span className="text-[11.5px] text-muted-foreground">Awaiting submission</span>
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span role="group" aria-label={`Review ${applicantName}`} className="flex items-center gap-1">
        <button
          type="button"
          onClick={openReview}
          title={`Review — ${applicantName}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Review</span>
        </button>

        {DECISIONS.filter((a) => !(status === 'APPROVED' && a.value === 'REJECTED')).map((a) => {
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
                isCurrent ? cn(a.active, 'cursor-default') : cn('border-border text-muted-foreground', a.hover),
                pending !== null && !isPending && 'opacity-50',
              )}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <a.icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          )
        })}
      </span>

      {error && !open && (
        <span role="alert" className="text-[11px] font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      )}

      {open && (
        <ReviewModal
          applicantName={applicantName}
          status={status}
          detail={detail}
          loading={loading}
          error={error}
          pending={pending}
          onDecision={setStatus}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  )
}

/* ---------------------------------------------------------------- modal */

function ReviewModal({
  applicantName,
  status,
  detail,
  loading,
  error,
  pending,
  onDecision,
  onClose,
}: {
  applicantName: string
  status: string
  detail: Detail | null
  loading: boolean
  error: string
  pending: string | null
  onDecision: (next: string) => void
  onClose: () => void
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !pending && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [pending, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center text-left sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !pending && onClose()} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Application review for ${applicantName}`}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg animate-fade-up flex-col rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold tracking-tight">Application review</h3>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {applicantName}
              {detail?.course ? ` · ${detail.course.title}` : ''}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => !pending && onClose()}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          ) : detail ? (
            <div className="space-y-5">
              <Section title="Programme">
                <Row label="Course" value={detail.course.title} />
                {detail.course.university && <Row label="University" value={detail.course.university.name} />}
                <Row label="Contact email" value={detail.user.email} />
                <Row label="Contact phone" value={detail.user.phone ?? '—'} />
              </Section>
              <Section title="Personal details">
                <KeyValues data={detail.personal} empty="No personal details submitted." />
              </Section>
              <Section title="Education details">
                <KeyValues data={detail.education} empty="No education details submitted." />
              </Section>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={() => !pending && onClose()}
            className="inline-flex h-9 items-center rounded-xl border border-border px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
          {DECISIONS.filter((a) => !(status === 'APPROVED' && a.value === 'REJECTED')).map((a) => {
            const isCurrent = a.value === status
            const isPending = pending === a.value
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => onDecision(a.value)}
                disabled={isCurrent || pending !== null}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors',
                  isCurrent ? cn(a.active, 'cursor-default') : cn('border-border text-foreground', a.hover),
                  pending !== null && !isPending && 'opacity-50',
                )}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <a.icon className="h-4 w-4" />}
                {a.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <dl className="divide-y divide-border rounded-xl border border-border">{children}</dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium">{value}</dd>
    </div>
  )
}

/** Humanises a camelCase / snake_case key for display. */
function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function KeyValues({ data, empty }: { data: Record<string, unknown> | null; empty: string }) {
  const entries = data && typeof data === 'object' ? Object.entries(data) : []
  const rows = entries.filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
  if (rows.length === 0) {
    return <p className="px-3.5 py-3 text-[12.5px] text-muted-foreground">{empty}</p>
  }
  return (
    <>
      {rows.map(([k, v]) => (
        <Row key={k} label={humanize(k)} value={typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)} />
      ))}
    </>
  )
}
