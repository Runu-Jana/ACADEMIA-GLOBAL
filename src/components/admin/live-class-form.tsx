'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, AlertCircle, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'

const PROVIDERS = [
  { value: 'JITSI', label: 'Jitsi (built-in room)' },
  { value: 'ZOOM', label: 'Zoom (external link)' },
  { value: 'MEET', label: 'Google Meet (external link)' },
]

const EMPTY = {
  courseId: '',
  title: '',
  description: '',
  provider: 'JITSI',
  externalUrl: '',
  startsAt: '',
  durationMin: '60',
}

/** Schedules a new live class for a course. */
export function LiveClassForm({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter()
  const [form, setForm] = React.useState({ ...EMPTY, courseId: courses[0]?.id ?? '' })
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const external = form.provider !== 'JITSI'
  const ready =
    form.courseId && form.title.trim().length >= 2 && form.startsAt && (!external || form.externalUrl.trim())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, durationMin: Number(form.durationMin) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not schedule the class.')
        return
      }
      setForm({ ...EMPTY, courseId: form.courseId })
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (courses.length === 0) {
    return (
      <div className="card-base flex items-start gap-3 p-5 text-[13.5px]">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p>No published courses yet — create a course before scheduling a live class.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card-base p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-holo-sweep">
          <Video className="h-4 w-4 text-white" />
        </span>
        Schedule a live class
      </h2>

      {error && (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Course" required className="sm:col-span-2">
          <Select value={form.courseId} onChange={set('courseId')}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title" required className="sm:col-span-2">
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Marketing Analytics — Live Session" maxLength={140} />
        </Field>

        <Field label="Starts at" required>
          <Input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
        </Field>
        <Field label="Duration (minutes)">
          <Input type="number" min={10} max={600} value={form.durationMin} onChange={set('durationMin')} />
        </Field>

        <Field label="Provider">
          <Select value={form.provider} onChange={set('provider')}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        {external && (
          <Field label="Meeting URL" required hint="The Zoom / Meet link students will join">
            <Input value={form.externalUrl} onChange={set('externalUrl')} placeholder="https://zoom.us/j/…" maxLength={500} />
          </Field>
        )}

        <Field label="Description" hint="Optional" className="sm:col-span-2">
          <Textarea value={form.description} onChange={set('description')} placeholder="What this session covers…" maxLength={500} />
        </Field>
      </div>

      <Button type="submit" variant="holo" loading={busy} disabled={busy || !ready} className="mt-4">
        {!busy && <CalendarPlus className="h-4 w-4" />}
        Schedule class
      </Button>
    </form>
  )
}
