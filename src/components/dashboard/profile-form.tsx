'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { initials } from '@/lib/utils'

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const

export type ProfileValues = {
  name: string
  phone: string
  dob: string
  gender: string
  city: string
  state: string
}

export function ProfileForm({
  initial,
  email,
  memberSince,
}: {
  initial: ProfileValues
  email: string
  memberSince: string
}) {
  const router = useRouter()

  const [form, setForm] = React.useState<ProfileValues>(initial)
  const [saved, setSaved] = React.useState<ProfileValues>(initial)
  const [error, setError] = React.useState('')
  const [ok, setOk] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const dirty = (Object.keys(form) as (keyof ProfileValues)[]).some((k) => form[k] !== saved[k])

  const set =
    (key: keyof ProfileValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setOk(false)
      setError('')
    }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOk(false)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save your profile')

      setSaved(form)
      setOk(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ---------------------------------------------------------- form */}
      <form onSubmit={onSubmit} className="card-base holo-ring order-2 p-5 lg:order-1">
        <h2 className="font-display text-lg font-extrabold">Personal details</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Keep this current — it&rsquo;s what appears on your admission forms and certificates.
        </p>

        <div aria-live="polite">
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {ok && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              Profile updated successfully.
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={set('name')}
              placeholder="Enter your full name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
            />
          </Field>

          <Field label="Mobile number" hint="Used for admission and class updates">
            <Input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+91 98765 43210"
              autoComplete="tel"
            />
          </Field>

          <Field label="Date of birth">
            <Input type="date" value={form.dob} onChange={set('dob')} autoComplete="bday" />
          </Field>

          <Field label="Gender">
            <Select value={form.gender} onChange={set('gender')}>
              <option value="">Not specified</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="City">
            <Input
              value={form.city}
              onChange={set('city')}
              placeholder="e.g. Ludhiana"
              autoComplete="address-level2"
            />
          </Field>

          <Field label="State" className="sm:col-span-2">
            <Input
              value={form.state}
              onChange={set('state')}
              placeholder="e.g. Punjab"
              autoComplete="address-level1"
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button type="submit" variant="holo" loading={loading} disabled={!dirty}>
            Save Changes
          </Button>
          {dirty && !loading && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm(saved)
                setError('')
                setOk(false)
              }}
            >
              Discard
            </Button>
          )}
          {!dirty && !ok && (
            <span className="text-[12.5px] text-muted-foreground">No unsaved changes.</span>
          )}
        </div>
      </form>

      {/* -------------------------------------------------------- account */}
      <aside className="order-1 space-y-4 lg:order-2">
        <div className="card-base p-5 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-fade text-xl font-bold text-white shadow-glow">
            {initials(form.name || saved.name)}
          </span>
          <p className="mt-3 truncate font-display text-base font-extrabold">
            {saved.name}
          </p>
          <p className="truncate text-[12.5px] text-muted-foreground">{email}</p>
        </div>

        <div className="card-base p-5">
          <h2 className="font-display text-base font-extrabold">Account</h2>

          <dl className="mt-3.5 space-y-3.5">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Email address
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 break-all text-[13px] font-semibold">
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {email}
              </dd>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Your sign-in email can&rsquo;t be changed here — contact support if you need it updated.
              </p>
            </div>

            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Member since
              </dt>
              <dd className="mt-1 text-[13px] font-semibold">{memberSince}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  )
}
