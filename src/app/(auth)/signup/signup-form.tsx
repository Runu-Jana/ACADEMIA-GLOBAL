'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

const rules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One letter', test: (v: string) => /[a-zA-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
]

export function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/dashboard'

  const [form, setForm] = React.useState({ name: '', email: '', phone: '', password: '' })
  const [show, setShow] = React.useState(false)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const passed = rules.filter((r) => r.test(form.password)).length
  const strength = form.password ? passed / rules.length : 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (passed < rules.length) {
      setError('Please choose a stronger password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      router.push(next)
      router.refresh()
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Takes less than a minute. Start learning today.
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

        <Field label="Full name" required>
          <Input
            value={form.name}
            onChange={set('name')}
            placeholder="Enter your full name"
            autoComplete="name"
            required
            autoFocus
          />
        </Field>

        <Field label="Email address" required>
          <Input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Mobile number" hint="Optional — used for admission updates">
          <Input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
        </Field>

        <Field label="Password" required>
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Create a password"
              autoComplete="new-password"
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

          {form.password && (
            <div className="mt-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    strength < 0.6 ? 'bg-red-500' : strength < 1 ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                  style={{ width: `${strength * 100}%` }}
                />
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
                {rules.map((r) => {
                  const ok = r.test(form.password)
                  return (
                    <li
                      key={r.label}
                      className={cn(
                        'flex items-center gap-1 text-[11px] font-medium transition-colors',
                        ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                      )}
                    >
                      <Check className={cn('h-3 w-3', !ok && 'opacity-30')} />
                      {r.label}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Field>

        <Button type="submit" variant="holo" size="lg" loading={loading} className="w-full">
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={next !== '/dashboard' ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-bold text-primary-600 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
