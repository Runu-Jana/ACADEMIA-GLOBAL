'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Save, ExternalLink } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { slugify } from '@/lib/utils'

export type UniversityFormValues = {
  name: string
  slug: string
  shortName: string
  about: string
  estYear: string
  naacGrade: string
  city: string
  state: string
  website: string
  approvals: string // comma-separated
  highlights: string // newline-separated
  rankings: string // newline-separated
  rating: string
  reviews: string
  students: string
  programs: string
  featured: boolean
  listed: boolean
  partnerStatus: string
  commissionPct: string
}

export const EMPTY_UNIVERSITY: UniversityFormValues = {
  name: '',
  slug: '',
  shortName: '',
  about: '',
  estYear: '',
  naacGrade: '',
  city: '',
  state: '',
  website: '',
  approvals: '',
  highlights: '',
  rankings: '',
  rating: '4.5',
  reviews: '0',
  students: '0',
  programs: '0',
  featured: false,
  listed: true,
  partnerStatus: 'PROSPECT',
  commissionPct: '0',
}

const PARTNER_STATUSES = [
  { value: 'PROSPECT', label: 'Prospect (not live)' },
  { value: 'IN_TALKS', label: 'In talks (not live)' },
  { value: 'ACTIVE', label: 'Active partner (courses can go live)' },
]

export function UniversityForm({
  initial,
  universityId,
  viewSlug,
}: {
  initial?: UniversityFormValues
  /** Present ⇒ edit mode (PATCH); absent ⇒ create mode (POST). */
  universityId?: string
  viewSlug?: string
}) {
  const router = useRouter()
  const editing = Boolean(universityId)

  const [values, setValues] = React.useState<UniversityFormValues>(initial ?? EMPTY_UNIVERSITY)
  const [slugTouched, setSlugTouched] = React.useState(editing)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [saved, setSaved] = React.useState(false)

  function set<K extends keyof UniversityFormValues>(key: K, value: UniversityFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  function onNameChange(next: string) {
    setValues((v) => ({ ...v, name: next, slug: slugTouched ? v.slug : slugify(next).slice(0, 120) }))
    setSaved(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch(editing ? `/api/admin/universities/${universityId}` : '/api/admin/universities', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values), // numbers/lists stay strings; the server parses them
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Could not save the university. Please try again.')
        return
      }

      if (editing) {
        setSaved(true)
        router.refresh()
      } else {
        router.push(`/admin/universities/${data.university.id}`)
        router.refresh()
      }
    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Changes saved.
        </p>
      )}

      {/* ------------------------------------------------------------ basics */}
      <section className="card-base p-4 sm:p-5">
        <h3 className="mb-4 text-[15px] font-bold">Basics</h3>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="University name" required className="sm:col-span-2">
            <Input
              value={values.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Chandigarh University"
              maxLength={160}
              required
            />
          </Field>

          <Field
            label="Slug"
            required
            hint="Auto-filled from the name — edit if you need a different URL."
          >
            <div className="flex items-center gap-2">
              <span className="hidden shrink-0 text-[12px] text-muted-foreground sm:block">/universities/</span>
              <Input
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  set('slug', e.target.value)
                }}
                placeholder="chandigarh-university"
                maxLength={120}
                required
              />
            </div>
          </Field>

          <Field label="Short name" required hint="Shown on badges & marks (e.g. CU).">
            <Input
              value={values.shortName}
              onChange={(e) => set('shortName', e.target.value)}
              placeholder="CU"
              maxLength={40}
              required
            />
          </Field>

          <Field label="City" required>
            <Input value={values.city} onChange={(e) => set('city', e.target.value)} placeholder="Mohali" required />
          </Field>

          <Field label="State" required>
            <Input value={values.state} onChange={(e) => set('state', e.target.value)} placeholder="Punjab" required />
          </Field>

          <Field label="Established year" required>
            <Input
              type="number"
              min="1800"
              max={new Date().getFullYear()}
              value={values.estYear}
              onChange={(e) => set('estYear', e.target.value)}
              placeholder="2012"
              required
            />
          </Field>

          <Field label="NAAC grade" hint="Leave blank if not applicable.">
            <Input value={values.naacGrade} onChange={(e) => set('naacGrade', e.target.value)} placeholder="A+" maxLength={20} />
          </Field>

          <Field label="Website" hint="Include https://" className="sm:col-span-2">
            <Input
              type="url"
              value={values.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://www.example.edu"
              maxLength={300}
            />
          </Field>

          <Field label="About" required className="sm:col-span-2">
            <Textarea
              value={values.about}
              onChange={(e) => set('about', e.target.value)}
              placeholder="Who they are, accreditation, campuses, strengths… Blank lines separate paragraphs on the About panel."
              className="min-h-[140px]"
              required
            />
          </Field>
        </div>
      </section>

      {/* -------------------------------------------- accreditation & profile */}
      <section className="card-base p-4 sm:p-5">
        <h3 className="mb-4 text-[15px] font-bold">Accreditation &amp; About panel</h3>

        <div className="space-y-3.5">
          <Field label="Approvals" hint="Comma-separated tokens, e.g. UGC, NAAC A+, AICTE, AIU">
            <Input
              value={values.approvals}
              onChange={(e) => set('approvals', e.target.value)}
              placeholder="UGC, NAAC A+, AICTE, AIU"
            />
          </Field>

          <Field label="Highlights" hint="One per line — the 'at a glance' bullets on the About panel.">
            <Textarea
              value={values.highlights}
              onChange={(e) => set('highlights', e.target.value)}
              placeholder={'NAAC A+ accredited\nUGC-entitled online degrees\n2.5 lakh+ learners on campus'}
              className="min-h-[110px]"
            />
          </Field>

          <Field label="Rankings & recognitions" hint="One per line — shown in the 'Rankings & Recognitions' block.">
            <Textarea
              value={values.rankings}
              onChange={(e) => set('rankings', e.target.value)}
              placeholder={'QS World University Rankings 2027: #526 globally\nNIRF 2025: #19 among universities\nNAAC A+ accredited'}
              className="min-h-[110px]"
            />
          </Field>
        </div>
      </section>

      {/* --------------------------------------------------------------- stats */}
      <section className="card-base p-4 sm:p-5">
        <h3 className="mb-4 text-[15px] font-bold">Stats</h3>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Rating (0–5)">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={values.rating}
              onChange={(e) => set('rating', e.target.value)}
            />
          </Field>
          <Field label="Reviews">
            <Input type="number" min="0" value={values.reviews} onChange={(e) => set('reviews', e.target.value)} />
          </Field>
          <Field label="Learners">
            <Input type="number" min="0" value={values.students} onChange={(e) => set('students', e.target.value)} />
          </Field>
          <Field label="Programmes">
            <Input type="number" min="0" value={values.programs} onChange={(e) => set('programs', e.target.value)} />
          </Field>
        </div>
      </section>

      {/* ---------------------------------------------- visibility & partnership */}
      <section className="card-base p-4 sm:p-5">
        <h3 className="mb-4 text-[15px] font-bold">Visibility &amp; partnership</h3>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Partner status" hint="Only ACTIVE partners' courses can be enrolled (paid).">
            <Select value={values.partnerStatus} onChange={(e) => set('partnerStatus', e.target.value)}>
              {PARTNER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Commission (%)" hint="What the partner pays per paid enrolment.">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={values.commissionPct}
              onChange={(e) => set('commissionPct', e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          {(
            [
              ['listed', 'Listed in the public directory'],
              ['featured', 'Feature on homepage'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary-300"
            >
              <Checkbox checked={values[key]} onChange={(e) => set(key, e.target.checked)} aria-label={label} />
              <span className="text-[13px] font-semibold">{label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Tip: keep “Listed” on so the university appears on the public Universities page.
        </p>
      </section>

      {/* ------------------------------------------------------------ actions */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <Button type="submit" variant="holo" loading={saving}>
          <Save className="h-4 w-4" />
          {editing ? 'Save Changes' : 'Create University'}
        </Button>

        <Link href="/admin/universities" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>

        {editing && viewSlug && (
          <Link
            href={`/universities/${viewSlug}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'ghost', className: 'ml-auto' })}
          >
            <ExternalLink className="h-4 w-4" />
            View on site
          </Link>
        )}
      </div>
    </form>
  )
}

/** Stored Json string[] → newline-separated textarea value. */
export function joinLines(value: unknown): string {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string').join('\n') : ''
}

/** Stored string[] → comma-separated input value. */
export function joinCommas(value: unknown): string {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string').join(', ') : ''
}
