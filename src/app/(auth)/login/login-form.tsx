'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

const demoAccounts = [
  { label: 'Student', email: 'rahul@student.in', password: 'Student@123' },
  { label: 'Admin', email: 'admin@academiaglobal.in', password: 'Admin@123' },
]

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || ''

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      // Admins land in the admin panel unless they were sent somewhere specific.
      const target = next || (data.user?.role === 'ADMIN' ? '/admin' : '/dashboard')
      router.push(target)
      router.refresh()
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Sign in to continue your learning journey.
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

        <Field label="Password" required>
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="pr-11"
              required
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

        <Button type="submit" variant="holo" size="lg" loading={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New to Academia Global?{' '}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
          className="font-bold text-primary-600 hover:underline"
        >
          Create an account
        </Link>
      </p>

      {/* Seeded demo logins — remove before going to production. */}
      <div className="mt-7 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Demo accounts
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {demoAccounts.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email)
                setPassword(a.password)
                setError('')
              }}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft"
            >
              <span className="block text-[13px] font-bold">{a.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
