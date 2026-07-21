'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'

const topics = ['Admission enquiry', 'Fees & scholarships', 'Technical support', 'University partnership', 'Something else']

export function ContactForm() {
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
        <p className="text-[15px] font-extrabold">Thanks — we&apos;ve got your message</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          A counsellor will reach out within one working day. For anything urgent, call
          1800-123-4567.
        </p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)} className="mt-2">
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input name="name" placeholder="Your name" required />
        </Field>
        <Field label="Mobile number" required>
          <Input name="phone" type="tel" placeholder="+91 98765 43210" required />
        </Field>
      </div>

      <Field label="Email address" required>
        <Input name="email" type="email" placeholder="you@example.com" required />
      </Field>

      <Field label="What's this about?" required>
        <Select name="topic" required defaultValue={topics[0]}>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Message" required>
        <Textarea name="message" placeholder="Tell us where you stopped studying and what you'd like to do next…" required />
      </Field>

      <Button type="submit" variant="holo" size="lg" loading={busy} className="w-full">
        {busy ? 'Sending…' : 'Send message'}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        This demo form doesn&apos;t deliver email yet — connect a mail provider before launch.
      </p>
    </form>
  )
}
