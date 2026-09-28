'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle, MailCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setSent(true)
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-up text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight">Check your email</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          If an account exists for <span className="font-semibold text-foreground">{email}</span>, we’ve
          sent a link to reset your password. It expires in 60 minutes.
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Didn’t get it? Check spam, or{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-bold text-primary-600 hover:underline"
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Forgot password?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter the email on your account and we’ll send you a link to reset your password.
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

        <Field label="Email address" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            autoFocus
          />
        </Field>

        <Button type="submit" variant="holo" size="lg" loading={loading} className="w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-bold text-primary-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
