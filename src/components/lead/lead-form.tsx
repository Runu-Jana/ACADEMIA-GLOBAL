'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, AlertCircle, PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'

type Source = 'directory' | 'callback' | 'counsellor'

/**
 * Captures a callback request. Used wherever a student shows interest in a
 * non-partner listing (or asks for a callback). Anonymous-friendly and
 * pre-filled for signed-in students.
 */
export function LeadForm({
  source = 'directory',
  interestedCourseId,
  interestedUniversityId,
  defaults,
  submitLabel,
}: {
  source?: Source
  interestedCourseId?: string
  interestedUniversityId?: string
  defaults?: { name?: string; email?: string; phone?: string }
  submitLabel?: string
}) {
  const t = useTranslations('leads')
  const label = submitLabel ?? t('requestCallback')
  const [form, setForm] = React.useState({
    name: defaults?.name ?? '',
    email: defaults?.email ?? '',
    phone: defaults?.phone ?? '',
    message: '',
  })
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source, interestedCourseId, interestedUniversityId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('errGeneric'))
        return
      }
      setDone(true)
    } catch {
      setError(t('errNetwork'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <span className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <p className="text-[13.5px] font-bold text-emerald-900 dark:text-emerald-200">
          {t('sentThanks', { name: form.name ? `, ${form.name.split(' ')[0]}` : '' })}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-emerald-800 dark:text-emerald-200/90">
          {t('sentBody')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[12px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      <Field label={t('yourName')} required>
        <Input value={form.name} onChange={set('name')} placeholder={t('leadNamePlaceholder')} autoComplete="name" required />
      </Field>
      <Field label={t('phone')} required>
        <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" required />
      </Field>
      <Field label={t('email')} required>
        <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" required />
      </Field>
      <Field label={t('messageLabel')} hint={t('messageHint')}>
        <Textarea value={form.message} onChange={set('message')} placeholder={t('messagePlaceholder')} maxLength={1000} className="min-h-[64px]" />
      </Field>
      <Button type="submit" variant="holo" loading={loading} disabled={loading} className="w-full">
        {!loading && <PhoneCall className="h-4 w-4" />}
        {loading ? t('submitting') : label}
      </Button>
      <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
        {t('agree')}
      </p>
    </form>
  )
}
