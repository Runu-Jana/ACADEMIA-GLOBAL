'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'

type FormState = {
  universityName: string
  contactName: string
  email: string
  phone: string
  website: string
  city: string
  state: string
  message: string
  password: string
}

const EMPTY: FormState = {
  universityName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  city: '',
  state: '',
  message: '',
  password: '',
}

export function PartnerApplyForm() {
  const router = useRouter()
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/partner/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
        return
      }
      router.push(typeof data.redirect === 'string' ? data.redirect : '/partner')
      router.refresh()
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Field label="Institution name" required>
        <Input
          value={form.universityName}
          onChange={set('universityName')}
          placeholder="e.g. Sunrise Institute of Technology"
          required
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <Input value={form.contactName} onChange={set('contactName')} placeholder="Full name" autoComplete="name" required />
        </Field>
        <Field label="Work email" required>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="you@institution.edu" autoComplete="email" required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" hint="Optional">
          <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" />
        </Field>
        <Field label="Website" hint="Optional">
          <Input value={form.website} onChange={set('website')} placeholder="institution.edu" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" hint="Optional">
          <Input value={form.city} onChange={set('city')} placeholder="e.g. Pune" autoComplete="address-level2" />
        </Field>
        <Field label="State" hint="Optional">
          <Input value={form.state} onChange={set('state')} placeholder="e.g. Maharashtra" autoComplete="address-level1" />
        </Field>
      </div>

      <Field label="Tell us about your programmes" hint="Optional — what you'd like to list">
        <Textarea
          value={form.message}
          onChange={set('message')}
          placeholder="We run online BBA, BCA and MBA programmes and would like to list them…"
          maxLength={1000}
        />
      </Field>

      <Field label="Create a password" required hint="At least 8 characters — you'll use this to sign in to your partner portal">
        <Input
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder="Choose a password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Button type="submit" variant="holo" size="lg" loading={loading} className="w-full">
        {loading ? 'Submitting…' : 'Submit partnership request'}
      </Button>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        We&rsquo;ll create your account right away. You can sign in immediately, but your programmes go
        live only after our team reviews and approves your institution.
      </p>
    </form>
  )
}
