'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2200)
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="animate-fade-up text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight">Invalid link</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          This reset link is missing its token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:underline"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="animate-fade-up text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight">Password updated</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Your password has been changed. Redirecting you to sign in…
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Sign in now
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter a new password for your account. Make it at least 8 characters.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Field label="New password" required>
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="pr-11"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm new password" required>
          <Input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            required
          />
        </Field>

        <Button type="submit" variant="holo" size="lg" loading={loading} className="w-full">
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-bold text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
