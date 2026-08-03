'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'

const TYPES = [
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'MID_TERM', label: 'Mid-term' },
  { value: 'FINAL', label: 'Final' },
]

export function TestSettings({
  id,
  initial,
}: {
  id: string
  initial: { title: string; type: string; totalMarks: number; passMarks: number; durationMin: number }
}) {
  const router = useRouter()
  const [form, setForm] = React.useState({
    title: initial.title,
    type: initial.type,
    totalMarks: String(initial.totalMarks),
    passMarks: String(initial.passMarks),
    durationMin: String(initial.durationMin),
  })
  const [busy, setBusy] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSaved(false)
    setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/tests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          totalMarks: Number(form.totalMarks),
          passMarks: Number(form.passMarks),
          durationMin: Number(form.durationMin),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not save.')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this test and all its questions and attempts?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/tests/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/admin/tests')
      else setError('Could not delete.')
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="card-base p-4 sm:p-5">
      {error && (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Test title" required className="sm:col-span-2">
          <Input value={form.title} onChange={set('title')} maxLength={140} />
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button type="submit" variant="holo" loading={busy} disabled={busy}>
          {!busy && <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save settings'}
        </Button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete test
        </button>
      </div>
    </form>
  )
}
