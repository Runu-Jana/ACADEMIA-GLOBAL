'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Layers, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'

export type StructureSubject = { id: string; code: string; title: string; credits: number; kind: string }
export type StructureTerm = { id: string; number: number; title: string; creditsRequired: number; subjects: StructureSubject[] }

const KINDS = ['CORE', 'ELECTIVE', 'LAB', 'PROJECT', 'AUDIT']

/** Edit a course's semesters and subjects — add, remove, done. */
export function StructureEditor({ courseId, terms }: { courseId: string; terms: StructureTerm[] }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function call(url: string, method: string, body?: object) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong.')
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('Network error — please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  // add-subject form
  const [sub, setSub] = React.useState({ termId: terms[0]?.id ?? '', code: '', title: '', credits: '4', kind: 'CORE' })
  const setS = (k: keyof typeof sub) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setSub((s) => ({ ...s, [k]: e.target.value }))

  // add-term form
  const [termTitle, setTermTitle] = React.useState('')

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    if (!sub.code.trim() || !sub.title.trim()) return
    const ok = await call('/api/admin/academics/subjects', 'POST', {
      courseId,
      termId: sub.termId || undefined,
      code: sub.code.trim(),
      title: sub.title.trim(),
      credits: Number(sub.credits),
      kind: sub.kind,
    })
    if (ok) setSub((s) => ({ ...s, code: '', title: '' }))
  }

  async function addTerm(e: React.FormEvent) {
    e.preventDefault()
    if (!termTitle.trim()) return
    const ok = await call('/api/admin/academics/terms', 'POST', { courseId, title: termTitle.trim() })
    if (ok) setTermTitle('')
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      {terms.map((t) => (
        <div key={t.id} className="card-base overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
            <h3 className="flex items-center gap-2 text-[13.5px] font-bold">
              <Layers className="h-4 w-4 text-primary-500" />
              {t.title}
              <span className="text-[11px] font-medium text-muted-foreground">· {t.creditsRequired} credits required</span>
            </h3>
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm(`Delete ${t.title}? Its subjects lose their semester link.`) && call(`/api/admin/academics/terms/${t.id}`, 'DELETE')}
              aria-label="Delete semester"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {t.subjects.length === 0 ? (
            <p className="px-4 py-3 text-[12.5px] text-muted-foreground">No subjects in this semester yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {t.subjects.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="w-28 shrink-0 font-mono text-[11.5px] text-muted-foreground">{s.code}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{s.title}</span>
                  <Badge tone="default">{s.kind}</Badge>
                  <span className="w-14 text-right text-[11.5px] text-muted-foreground">{s.credits} cr</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => window.confirm('Delete this subject and its results?') && call(`/api/admin/academics/subjects/${s.id}`, 'DELETE')}
                    aria-label="Delete subject"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* -------------------------------------------------- add subject */}
      <form onSubmit={addSubject} className="card-base holo-ring p-4">
        <h3 className="mb-3 text-[13.5px] font-bold">Add a subject</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Semester">
            <Select value={sub.termId} onChange={setS('termId')}>
              {terms.length === 0 && <option value="">No semesters yet</option>}
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </Select>
          </Field>
          <Field label="Kind">
            <Select value={sub.kind} onChange={setS('kind')}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </Field>
          <Field label="Code" required>
            <Input value={sub.code} onChange={setS('code')} placeholder="BBA-DM-201" maxLength={30} />
          </Field>
          <Field label="Credits">
            <Input type="number" min={1} max={20} value={sub.credits} onChange={setS('credits')} />
          </Field>
          <Field label="Title" required className="sm:col-span-2">
            <Input value={sub.title} onChange={setS('title')} placeholder="Digital Marketing Fundamentals" maxLength={140} />
          </Field>
        </div>
        <Button type="submit" variant="holo" size="sm" loading={busy} disabled={busy || !sub.code.trim() || !sub.title.trim()} className="mt-3">
          <Plus className="h-3.5 w-3.5" />
          Add subject
        </Button>
      </form>

      {/* ---------------------------------------------------- add term */}
      <form onSubmit={addTerm} className="card-base flex flex-wrap items-end gap-3 p-4">
        <Field label="New semester" className="flex-1">
          <Input value={termTitle} onChange={(e) => setTermTitle(e.target.value)} placeholder="e.g. Semester 3" maxLength={80} />
        </Field>
        <Button type="submit" variant="outline" size="sm" loading={busy} disabled={busy || !termTitle.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Add semester
        </Button>
      </form>
    </div>
  )
}
