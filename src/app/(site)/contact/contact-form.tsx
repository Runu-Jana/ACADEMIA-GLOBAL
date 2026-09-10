'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { SUPPORT_PHONE } from '@/lib/contact'

const TOPIC_KEYS = ['admission', 'fees', 'tech', 'partnership', 'other'] as const

export function ContactForm() {
  const t = useTranslations('contact.form')
  const topics = TOPIC_KEYS.map((k) => t(`topics.${k}`))
  const [sent, setSent] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    // No mail service is wired up yet — this records intent in the UI only.
    setTimeout(() => {
      setBusy(false)
      setSent(true)
    }, 600)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <p className="text-[15px] font-extrabold">{t('sentTitle')}</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          {t('sentBody', { phone: SUPPORT_PHONE })}
        </p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)} className="mt-2">
          {t('sendAnother')}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('name')} required>
          <Input name="name" placeholder={t('namePlaceholder')} required />
        </Field>
        <Field label={t('phone')} required>
          <Input name="phone" type="tel" placeholder="+91 98765 43210" required />
        </Field>
      </div>

      <Field label={t('email')} required>
        <Input name="email" type="email" placeholder="you@example.com" required />
      </Field>

      <Field label={t('topic')} required>
        <Select name="topic" required defaultValue={topics[0]}>
          {topics.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t('message')} required>
        <Textarea name="message" placeholder={t('messagePlaceholder')} required />
      </Field>

      <Button type="submit" variant="holo" size="lg" loading={busy} className="w-full">
        {busy ? t('sending') : t('send')}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        {t('demoNote')}
      </p>
    </form>
  )
}
