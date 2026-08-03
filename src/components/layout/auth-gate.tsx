'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { X, Sparkles, GraduationCap, GitCompare, FileText, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

/**
 * A soft, dismissable sign-up / log-in prompt that appears once the visitor has
 * scrolled deep enough to look genuinely engaged — the aggregator's chance to
 * turn an anonymous browser into a lead without the SEO/UX cost of a hard wall.
 *
 * Guardrails, deliberately:
 * - never for signed-in visitors, and not on active funnels (apply, counsellor).
 * - engagement-triggered (deep scroll), never on page load — avoids Google's
 *   intrusive-interstitial penalty.
 * - always dismissable; a dismissal snoozes it for a week and it shows at most
 *   once per session. Signing up/in suppresses it for good. State lives in
 *   localStorage/sessionStorage, so there's no server cost per page.
 */

const SNOOZE_KEY = 'ag_authgate_snoozed_until'
const DONE_KEY = 'ag_authgate_done'
const SESSION_KEY = 'ag_authgate_shown'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

// Active funnels where an interruption would cost more than it captures.
const EXCLUDED = ['/apply', '/counsellor']

const BENEFITS = [
  { icon: GitCompare, text: 'Save courses and compare them side by side' },
  { icon: FileText, text: 'Unlock full fee details and downloadable brochures' },
  { icon: GraduationCap, text: 'Track your applications and pick up where you left off' },
]

export function AuthGate({ signedIn }: { signedIn: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const excluded = EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<'signup' | 'login'>('signup')
  const [form, setForm] = React.useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const firstFieldRef = React.useRef<HTMLInputElement>(null)
  const armed = React.useRef(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // Arm the deep-scroll trigger (unless suppressed for this visitor/session).
  React.useEffect(() => {
    if (signedIn || excluded) return
    let suppressed = false
    try {
      const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0)
      suppressed =
        Boolean(localStorage.getItem(DONE_KEY)) ||
        (snoozedUntil > 0 && Date.now() < snoozedUntil) ||
        Boolean(sessionStorage.getItem(SESSION_KEY))
    } catch {
      // storage blocked — fail closed (don't nag) rather than open.
      suppressed = true
    }
    if (suppressed) return

    function onScroll() {
      if (armed.current) return
      const doc = document.documentElement
      const reached = window.scrollY + window.innerHeight
      const deepEnough = window.scrollY > 1400 && reached / doc.scrollHeight > 0.55
      if (!deepEnough) return
      armed.current = true
      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* ignore */
      }
      setOpen(true)
      window.removeEventListener('scroll', onScroll)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [signedIn, excluded])

  // While open: initial focus, Escape to close, and lock the page behind it.
  React.useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 60)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function dismiss() {
    setOpen(false)
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
      const body =
        mode === 'signup'
          ? { name: form.name.trim(), email: form.email.trim(), password: form.password }
          : { email: form.email.trim(), password: form.password }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
        return
      }
      // Success both signs them in (cookie set by the API) and retires the gate.
      try {
        localStorage.setItem(DONE_KEY, '1')
      } catch {
        /* ignore */
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (signedIn || excluded || !open) return null

  const isSignup = mode === 'signup'
  const next = encodeURIComponent(pathname || '/')

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
        onClick={dismiss}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="authgate-title"
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-t-3xl border border-border bg-card shadow-lift sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-border bg-card/80 text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ------------------------------------------------------- pitch */}
        <div className="border-b border-border bg-gradient-to-br from-primary-50 to-surface p-5 dark:from-primary-500/10 dark:to-transparent sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:border-primary-500/30 dark:text-primary-300">
            <Sparkles className="h-3 w-3" />
            Free account
          </span>
          <h2 id="authgate-title" className="mt-2.5 text-balance font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            {isSignup ? 'Get the most out of Academia Global' : 'Welcome back'}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                <b.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* -------------------------------------------------------- form */}
        <form onSubmit={submit} className="space-y-3.5 p-5 sm:p-6">
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          {isSignup && (
            <Field label="Full name" required>
              <Input ref={firstFieldRef} value={form.name} onChange={set('name')} placeholder="Aditi Sharma" maxLength={80} autoComplete="name" />
            </Field>
          )}
          <Field label="Email" required>
            <Input
              ref={isSignup ? undefined : firstFieldRef}
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              maxLength={120}
              autoComplete="email"
            />
          </Field>
          <Field label="Password" required hint={isSignup ? 'At least 8 characters' : undefined}>
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={isSignup ? 'Create a password' : 'Your password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </Field>

          <Button type="submit" variant="holo" size="lg" loading={loading} disabled={loading} className="w-full">
            {isSignup ? 'Create free account' : 'Log in'}
          </Button>

          <p className="text-center text-[12.5px] text-muted-foreground">
            {isSignup ? 'Already have an account?' : 'New to Academia Global?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? 'login' : 'signup')
                setError('')
              }}
              className="font-bold text-primary-600 hover:underline dark:text-primary-300"
            >
              {isSignup ? 'Log in' : 'Create one'}
            </button>
          </p>

          <div className="flex items-center justify-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              We never share your details
            </span>
            <span aria-hidden>·</span>
            <button type="button" onClick={dismiss} className="font-semibold hover:text-foreground">
              Keep browsing
            </button>
          </div>

          {/* Accessible full-page fallback for anyone who prefers it. */}
          <p className="text-center text-[11px] text-muted-foreground/70">
            <Link href={`/${isSignup ? 'signup' : 'login'}?next=${next}`} className="hover:underline">
              Open the full {isSignup ? 'sign-up' : 'login'} page
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
