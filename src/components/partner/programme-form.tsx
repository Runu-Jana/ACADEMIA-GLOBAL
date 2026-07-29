'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea, Select, Checkbox } from '@/components/ui/field'
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'

export type ProgrammeInitial = {
  id: string
  title: string
  subtitle: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number
  originalFee: number | null
  discountPct: number
  about: string
  eligibility: string
  examMode: string
  highlights: string[]
  skills: string[]
  recruiters: string[]
  isUgcEntitled: boolean
  hasPlacement: boolean
  hasLiveClass: boolean
}

type FormState = {
  title: string
  subtitle: string
  level: string
  mode: string
  stream: string
  durationYears: string
  feePerYear: string
  originalFee: string
  discountPct: string
  about: string
  eligibility: string
  examMode: string
  highlights: string
  skills: string
  recruiters: string
  isUgcEntitled: boolean
  hasPlacement: boolean
  hasLiveClass: boolean
}

function toState(c?: ProgrammeInitial): FormState {
  return {
    title: c?.title ?? '',
    subtitle: c?.subtitle ?? '',
    level: c?.level ?? 'UG',
    mode: c?.mode ?? 'ONLINE',
    stream: c?.stream ?? 'MANAGEMENT',
    durationYears: c ? String(c.durationYears) : '3',
    feePerYear: c ? String(c.feePerYear) : '',
    originalFee: c?.originalFee != null ? String(c.originalFee) : '',
    discountPct: c ? String(c.discountPct) : '0',
    about: c?.about ?? '',
    eligibility: c?.eligibility ?? '',
    examMode: c?.examMode ?? 'Online Proctored',
    highlights: c?.highlights.join(', ') ?? '',
    skills: c?.skills.join(', ') ?? '',
    recruiters: c?.recruiters.join(', ') ?? '',
    isUgcEntitled: c?.isUgcEntitled ?? true,
    hasPlacement: c?.hasPlacement ?? true,
    hasLiveClass: c?.hasLiveClass ?? true,
  }
}

export function ProgrammeForm({ course }: { course?: ProgrammeInitial }) {
  const router = useRouter()
  const editing = Boolean(course)
  const [form, setForm] = React.useState<FormState>(() => toState(course))
  const [error, setError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const setBool = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.checked }))

  async function save() {
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/partner/programmes/${course!.id}` : '/api/partner/programmes'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not save this programme.')
        return null
      }
      return data.course as { id: string }
    } catch {
      setError('Network error — please try again.')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const saved = await save()
    if (saved) {
      router.push('/partner/programmes')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* --------------------------------------------------------- basics */}
      <section className="card-base space-y-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Basics</h2>
        <Field label="Programme title" required>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Online MBA in Business Analytics" required />
        </Field>
        <Field label="One-line subtitle" required>
          <Input value={form.subtitle} onChange={set('subtitle')} placeholder="A short line that sells the programme." required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Level" required>
            <Select value={form.level} onChange={set('level')}>
              {COURSE_LEVELS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mode" required>
            <Select value={form.mode} onChange={set('mode')}>
              {COURSE_MODES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Stream" required>
            <Select value={form.stream} onChange={set('stream')}>
              {STREAMS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      {/* ------------------------------------------------------ fees + duration */}
      <section className="card-base space-y-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Duration & fees</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Duration (years)" required>
            <Input type="number" step="0.25" min="0.25" value={form.durationYears} onChange={set('durationYears')} required />
          </Field>
          <Field label="Fee / year (₹)" required>
            <Input type="number" min="0" value={form.feePerYear} onChange={set('feePerYear')} placeholder="45000" required />
          </Field>
          <Field label="Original fee (₹)" hint="Optional">
            <Input type="number" min="0" value={form.originalFee} onChange={set('originalFee')} placeholder="60000" />
          </Field>
          <Field label="Discount %" hint="Optional">
            <Input type="number" min="0" max="100" value={form.discountPct} onChange={set('discountPct')} />
          </Field>
        </div>
        <Field label="Examination mode">
          <Input value={form.examMode} onChange={set('examMode')} placeholder="Online Proctored" />
        </Field>
      </section>

      {/* --------------------------------------------------------- content */}
      <section className="card-base space-y-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Details</h2>
        <Field label="About this programme" required>
          <Textarea value={form.about} onChange={set('about')} className="min-h-[140px]" placeholder="What the programme covers, who it's for, how it's delivered…" required />
        </Field>
        <Field label="Eligibility" required>
          <Textarea value={form.eligibility} onChange={set('eligibility')} placeholder="e.g. Bachelor's degree in any discipline with 50% aggregate." required />
        </Field>
        <Field label="Highlights" hint="Comma separated">
          <Input value={form.highlights} onChange={set('highlights')} placeholder="Live weekend classes, Industry capstone, Placement support" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Skills you'll gain" hint="Comma separated">
            <Input value={form.skills} onChange={set('skills')} placeholder="Python, SQL, Forecasting" />
          </Field>
          <Field label="Hiring partners" hint="Comma separated">
            <Input value={form.recruiters} onChange={set('recruiters')} placeholder="Deloitte, TCS, Infosys" />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-[13px] font-medium">
            <Checkbox checked={form.isUgcEntitled} onChange={setBool('isUgcEntitled')} />
            UGC entitled
          </label>
          <label className="inline-flex items-center gap-2 text-[13px] font-medium">
            <Checkbox checked={form.hasPlacement} onChange={setBool('hasPlacement')} />
            Placement support
          </label>
          <label className="inline-flex items-center gap-2 text-[13px] font-medium">
            <Checkbox checked={form.hasLiveClass} onChange={setBool('hasLiveClass')} />
            Live classes
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/partner/programmes')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" variant="holo" loading={saving}>
          {!saving && <Save className="h-4 w-4" />}
          {editing ? 'Save changes' : 'Create draft'}
        </Button>
      </div>

      <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
        <Send className="mt-0.5 h-3 w-3 shrink-0" />
        {editing
          ? 'Saving edits to a live programme returns it to review until an operator re-approves it.'
          : 'This saves a draft. You can submit it for review from your programmes list.'}
      </p>
    </form>
  )
}
