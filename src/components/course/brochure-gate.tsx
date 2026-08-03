'use client'

import * as React from 'react'
import { Download, X, FileText, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

/**
 * Intent soft-gate on the course brochure.
 *
 * The click is the strongest interest signal on the page, so for an anonymous
 * visitor we ask for name/email/phone first — creating a `brochure` lead tied to
 * this course (which flows into the same partner-steering funnel as every other
 * lead) — and then hand them the brochure. Signed-in visitors, or anyone who has
 * already unlocked one this browser, go straight through. It's a soft gate: the
 * brochure page URL itself stays open; we're capturing intent, not walling content.
 */

const UNLOCK_KEY = 'ag_brochure_unlocked'

export function BrochureGate({
  slug,
  courseId,
  courseTitle,
  signedIn,
}: {
  slug: string
  courseId: string
  courseTitle: string
  signedIn: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', email: '', phone: '' })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const firstRef = React.useRef<HTMLInputElement>(null)

  const brochureHref = `/brochure/${slug}`

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function alreadyUnlocked() {
    try {
      return Boolean(localStorage.getItem(UNLOCK_KEY))
    } catch {
      return false
    }
  }

  function handleClick(e: React.MouseEvent) {
    // Signed-in or already-captured → let the normal link open a new tab.
    if (signedIn || alreadyUnlocked()) return
    e.preventDefault()
    setError('')
    setOpen(true)
  }

  // Escape + initial focus while the modal is up.
  React.useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstRef.current?.focus(), 60)
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const ready =
    form.name.trim().length >= 2 && /.+@.+\..+/.test(form.email) && form.phone.trim().length >= 8

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'brochure', interestedCourseId: courseId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Please check your details and try again.')
        return
      }
      try {
        localStorage.setItem(UNLOCK_KEY, '1')
      } catch {
        /* ignore */
      }
      // Deliver the brochure. Same-tab navigation is reliable after an async
      // call (a popup would risk the blocker); the brochure page has a back link.
      window.location.assign(brochureHref)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <a
        href={brochureHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={buttonVariants({ variant: 'outline', className: 'w-full' })}
      >
        <Download className="h-4 w-4" />
        Download Brochure
      </a>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="brochure-gate-title"
            className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-t-3xl border border-border bg-card shadow-lift sm:rounded-3xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-border bg-card/80 text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 border-b border-border bg-gradient-to-br from-primary-50 to-surface p-5 dark:from-primary-500/10 dark:to-transparent sm:p-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-holo-sweep text-white shadow-glow">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id="brochure-gate-title" className="font-display text-lg font-extrabold tracking-tight">
                  Get the brochure
                </h2>
                <p className="mt-0.5 text-pretty text-[12.5px] text-muted-foreground">
                  Tell us where to reach you and we&rsquo;ll open the{' '}
                  <span className="font-semibold text-foreground">{courseTitle}</span> brochure. A
                  counsellor can help with admissions if you&rsquo;d like.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3.5 p-5 sm:p-6">
              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                  {error}
                </p>
              )}

              <Field label="Full name" required>
                <Input ref={firstRef} value={form.name} onChange={set('name')} placeholder="Aditi Sharma" maxLength={80} autoComplete="name" />
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Email" required>
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" maxLength={120} autoComplete="email" />
                </Field>
                <Field label="Phone" required>
                  <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" maxLength={20} autoComplete="tel" />
                </Field>
              </div>

              <Button type="submit" variant="holo" size="lg" loading={loading} disabled={loading || !ready} className="w-full">
                {!loading && <Download className="h-4 w-4" />}
                Get the brochure
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                We only use this to help with your admission — no spam.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
