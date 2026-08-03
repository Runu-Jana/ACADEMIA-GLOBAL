'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'

const TYPES = [
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'MID_TERM', label: 'Mid-term' },
  { value: 'FINAL', label: 'Final' },
]

/** Creates a test under a course's module, then jumps to it so questions can be added. */
export function TestForm({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter()
  const [courseId, setCourseId] = React.useState(courses[0]?.id ?? '')
  const [modules, setModules] = React.useState<{ id: string; title: string }[]>([])
  const [moduleId, setModuleId] = React.useState('')
  const [loadingModules, setLoadingModules] = React.useState(false)
  const [form, setForm] = React.useState({ title: '', type: 'QUIZ', totalMarks: '20', passMarks: '8', durationMin: '20' })
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // Load the chosen course's modules for the dependent dropdown.
  React.useEffect(() => {
    if (!courseId) {
      setModules([])
      setModuleId('')
      return
    }
    let cancelled = false
    setLoadingModules(true)
    fetch(`/api/admin/modules?courseId=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const mods = Array.isArray(data.modules) ? data.modules : []
        setModules(mods)
        setModuleId(mods[0]?.id ?? '')
      })
      .catch(() => !cancelled && setModules([]))
      .finally(() => !cancelled && setLoadingModules(false))
    return () => {
      cancelled = true
    }
  }, [courseId])

  const ready = moduleId && form.title.trim().length >= 2

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          title: form.title,
          type: form.type,
          totalMarks: Number(form.totalMarks),
          passMarks: Number(form.passMarks),
          durationMin: Number(form.durationMin),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not create the test.')
        return
      }
      router.push(`/admin/tests/${data.id}`)
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
        <p>Create a course with at least one module before authoring a test.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card-base p-4 sm:p-5">
      <h2 className="mb-3 text-[14px] font-bold">Create a test</h2>

      {error && (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Course" required>
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Module" required hint={loadingModules ? 'Loading…' : modules.length === 0 ? 'This course has no modules yet' : undefined}>
          <Select value={moduleId} onChange={(e) => setModuleId(e.target.value)} disabled={loadingModules || modules.length === 0}>
            {modules.length === 0 && <option value="">No modules</option>}
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Test title" required className="sm:col-span-2">
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Module 1 Quiz" maxLength={140} />
        </Field>

        <Field label="Type">
          <Select value={form.type} onChange={set('type')}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duration (minutes)">
          <Input type="number" min={5} max={240} value={form.durationMin} onChange={set('durationMin')} />
        </Field>
        <Field label="Total marks">
          <Input type="number" min={1} max={500} value={form.totalMarks} onChange={set('totalMarks')} />
        </Field>
        <Field label="Pass marks">
          <Input type="number" min={0} max={500} value={form.passMarks} onChange={set('passMarks')} />
        </Field>
      </div>

      <Button type="submit" variant="holo" loading={busy} disabled={busy || !ready} className="mt-4">
        {!busy && <FilePlus2 className="h-4 w-4" />}
        Create &amp; add questions
      </Button>
    </form>
  )
}
