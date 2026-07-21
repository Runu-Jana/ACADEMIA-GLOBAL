'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Save, ExternalLink } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'
import { slugify } from '@/lib/utils'

export type CourseFormValues = {
  title: string
  slug: string
  subtitle: string
  universityId: string
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
  featured: boolean
}

export const EMPTY_COURSE: CourseFormValues = {
  title: '',
  slug: '',
  subtitle: '',
  universityId: '',
  level: 'UG',
  mode: 'ONLINE',
  stream: 'MANAGEMENT',
  durationYears: '3',
  feePerYear: '',
  originalFee: '',
  discountPct: '0',
  about: '',
  eligibility: '',
  examMode: 'Online Proctored',
  highlights: '',
  skills: '',
  recruiters: '',
  isUgcEntitled: true,
  hasPlacement: true,
  hasLiveClass: true,
  featured: false,
}

export function CourseForm({
  universities,
  initial,
  courseId,
  viewSlug,
}: {
  universities: { id: string; name: string }[]
  initial?: CourseFormValues
  /** Present ⇒ edit mode (PATCH); absent ⇒ create mode (POST). */
  courseId?: string
  viewSlug?: string
}) {
  const router = useRouter()
  const editing = Boolean(courseId)

  const [values, setValues] = React.useState<CourseFormValues>(initial ?? EMPTY_COURSE)
  // In edit mode the slug is already authored — never silently rewrite it.
  const [slugTouched, setSlugTouched] = React.useState(editing)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [saved, setSaved] = React.useState(false)

  function set<K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  function onTitleChange(next: string) {
    setValues((v) => ({
      ...v,
      title: next,
      slug: slugTouched ? v.slug : slugify(next).slice(0, 120),
    }))
    setSaved(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch(editing ? `/api/admin/courses/${courseId}` : '/api/admin/courses', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          // Numbers stay strings here; zod coerces them server-side.
          highlights: values.highlights,
          skills: values.skills,
          recruiters: values.recruiters,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Could not save the course. Please try again.')
        return
      }

      if (editing) {
        setSaved(true)
        router.refresh()
      } else {
        // Straight into the editor so modules and lessons can be added next.
        router.push(`/admin/courses/${data.course.id}`)
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
          <Field label="Course title" required className="sm:col-span-2">
            <Input
              value={values.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Online MBA in Business Analytics"
              maxLength={160}
              required
            />
          </Field>

          <Field
            label="Slug"
            required
            hint="Auto-filled from the title — edit if you need a different URL."
            className="sm:col-span-2"
          >
            <div className="flex items-center gap-2">
              <span className="hidden shrink-0 text-[12px] text-muted-foreground sm:block">
                /courses/
              </span>
              <Input
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  set('slug', e.target.value)
                }}
                placeholder="online-mba-business-analytics"
                maxLength={120}
                required
              />
            </div>
          </Field>

          <Field label="Subtitle" required className="sm:col-span-2">
            <Input
              value={values.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
              placeholder="One line that sells the programme."
              maxLength={300}
              required
            />
          </Field>

          <Field label="University" required>
            <Select
              value={values.universityId}
              onChange={(e) => set('universityId', e.target.value)}
              required
            >
              <option value="">Select a university…</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Stream" required>
            <Select value={values.stream} onChange={(e) => set('stream', e.target.value)} required>
              {STREAMS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Level" required>
            <Select value={values.level} onChange={(e) => set('level', e.target.value)} required>
              {COURSE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Mode" required>
            <Select value={values.mode} onChange={(e) => set('mode', e.target.value)} required>
              {COURSE_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      {/* ---------------------------------------------------- duration & fee */}
      <section className="card-base p-4 sm:p-5">
        <h3 className="mb-4 text-[15px] font-bold">Duration &amp; Fees</h3>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Duration (years)" required hint="Decimals allowed, e.g. 1.5">
            <Input
              type="number"
              step="0.25"
              min="0.25"
              max="10"
              value={values.durationYears}
              onChange={(e) => set('durationYears', e.target.value)}
              required
            />
          </Field>

          <Field label="Fee per year (₹)" required>
            <Input
              type="number"
              min="0"
              step="500"
              value={values.feePerYear}
              onChange={(e) => set('feePerYear', e.target.value)}
              placeholder="45000"
              required
            />
          </Field>

          <Field label="Original fee (₹)" hint="Leave blank if there is no strike-through price.">
            <Input
              type="number"
              min="0"
              step="500"
              value={values.originalFee}
              onChange={(e) => set('originalFee', e.target.value)}
              placeholder="60000"
            />
          </Field>

          <Field label="Discount (%)">
            <Input
              type="number"
              min="0"
              max="100"
              value={values.discountPct}
              onChange={(e) => set('discountPct', e.target.value)}
            />
          </Field>

          <Field label="Exam mode" className="sm:col-span-2">
            <Input
              value={values.examMode}
              onChange={(e) => set('examMode', e.target.value)}
              placeholder="Online Proctored"
              maxLength={120}
            />
          </Field>
        </div>
      </section>

      {/* ----------------------------------------------------------- content */}
      <section className="card-base p-4 sm:p-5">
        <h3 className="mb-4 text-[15px] font-bold">Programme Detail</h3>

        <div className="space-y-3.5">
          <Field label="About this course" required>
            <Textarea
              value={values.about}
              onChange={(e) => set('about', e.target.value)}
              placeholder="What the programme covers, who it is for, how it is delivered…"
              className="min-h-[140px]"
              required
            />
          </Field>

          <Field label="Eligibility" required>
            <Textarea
              value={values.eligibility}
              onChange={(e) => set('eligibility', e.target.value)}
              placeholder="e.g. Bachelor's degree in any discipline with 50% aggregate."
              className="min-h-[84px]"
              required
            />
          </Field>

          <Field label="Highlights" hint="Comma-separated — each becomes a bullet on the course page.">
            <Input
              value={values.highlights}
              onChange={(e) => set('highlights', e.target.value)}
              placeholder="Live weekend classes, Industry capstone, Placement support"
            />
          </Field>

          <Field label="Skills gained" hint="Comma-separated.">
            <Input
              value={values.skills}
              onChange={(e) => set('skills', e.target.value)}
              placeholder="Python, SQL, Data Visualisation, Forecasting"
            />
          </Field>

          <Field label="Top recruiters" hint="Comma-separated.">
            <Input
              value={values.recruiters}
              onChange={(e) => set('recruiters', e.target.value)}
              placeholder="Deloitte, TCS, Infosys, Amazon"
            />
          </Field>
        </div>
      </section>

      {/* ------------------------------------------------------------- flags */}
      <section className="card-base p-4 sm:p-5">
        <h3 className="mb-4 text-[15px] font-bold">Flags</h3>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['isUgcEntitled', 'UGC entitled'],
              ['hasLiveClass', 'Live classes'],
              ['hasPlacement', 'Placement support'],
              ['featured', 'Feature on homepage'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary-300"
            >
              <Checkbox
                checked={values[key]}
                onChange={(e) => set(key, e.target.checked)}
                aria-label={label}
              />
              <span className="text-[13px] font-semibold">{label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ actions */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <Button type="submit" variant="holo" loading={saving}>
          <Save className="h-4 w-4" />
          {editing ? 'Save Changes' : 'Create Course'}
        </Button>

        <Link href="/admin/courses" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>

        {editing && viewSlug && (
          <Link
            href={`/courses/${viewSlug}`}
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

/** Turns the stored `Json` columns back into the comma-separated input value. */
export function joinList(value: string[]) {
  return value.join(', ')
}
