'use client'

import * as React from 'react'
import { Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ResultSubject = {
  id: string
  code: string
  title: string
  internalMarks: number
  externalMarks: number
}
export type ResultStudent = { id: string; name: string }
export type ExistingResult = {
  subjectId: string
  userId: string
  internalScore: number
  externalScore: number
  grade: string | null
}

/**
 * Enter/publish results for one subject at a time. Pick a subject, fill each
 * enrolled student's internal + external marks, and save — the grade and grade
 * points are computed server-side and flow straight into the student's SGPA.
 */
export function ResultsEditor({
  subjects,
  students,
  results,
}: {
  subjects: ResultSubject[]
  students: ResultStudent[]
  results: ExistingResult[]
}) {
  const [subjectId, setSubjectId] = React.useState(subjects[0]?.id ?? '')
  const subject = subjects.find((s) => s.id === subjectId)

  const existing = React.useMemo(() => {
    const m = new Map<string, ExistingResult>()
    for (const r of results) if (r.subjectId === subjectId) m.set(r.userId, r)
    return m
  }, [results, subjectId])

  if (subjects.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Add subjects first, then enter results here.</p>
  }
  if (students.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No students are enrolled in this course yet.</p>
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[12px] font-bold text-muted-foreground">Subject</span>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-10 w-full max-w-md rounded-xl border border-input bg-surface px-3 text-sm outline-none focus:border-primary-400"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.title}
            </option>
          ))}
        </select>
      </label>

      {subject && (
        <div className="card-base overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex-1">Student</span>
            <span className="w-20 text-center">/{subject.internalMarks}</span>
            <span className="w-20 text-center">/{subject.externalMarks}</span>
            <span className="w-16 text-center">Grade</span>
            <span className="w-24" />
          </div>
          <ul className="divide-y divide-border">
            {students.map((st) => (
              <ResultRow key={st.id} subject={subject} student={st} existing={existing.get(st.id)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ResultRow({
  subject,
  student,
  existing,
}: {
  subject: ResultSubject
  student: ResultStudent
  existing?: ExistingResult
}) {
  const [internal, setInternal] = React.useState(existing ? String(existing.internalScore) : '')
  const [external, setExternal] = React.useState(existing ? String(existing.externalScore) : '')
  const [grade, setGrade] = React.useState(existing?.grade ?? '')
  const [busy, setBusy] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState('')

  // Reset the row when the subject changes underneath it.
  React.useEffect(() => {
    setInternal(existing ? String(existing.internalScore) : '')
    setExternal(existing ? String(existing.externalScore) : '')
    setGrade(existing?.grade ?? '')
    setSaved(false)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id])

  const ready = internal !== '' && external !== ''

  async function save() {
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/academics/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: student.id,
          subjectId: subject.id,
          internalScore: Number(internal),
          externalScore: Number(external),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Save failed.')
        return
      }
      setGrade(String(data.grade ?? ''))
      setSaved(true)
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  const num = 'h-9 w-20 rounded-lg border border-input bg-surface px-2 text-center text-sm tabular-nums outline-none focus:border-primary-400'

  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{student.name}</span>
      <input type="number" min={0} max={subject.internalMarks} value={internal} onChange={(e) => { setInternal(e.target.value); setSaved(false) }} className={num} aria-label={`${student.name} internal`} />
      <input type="number" min={0} max={subject.externalMarks} value={external} onChange={(e) => { setExternal(e.target.value); setSaved(false) }} className={num} aria-label={`${student.name} external`} />
      <span className="w-16 text-center text-[13px] font-bold">
        {grade ? <span className="rounded-md bg-primary-50 px-1.5 py-0.5 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">{grade}</span> : '—'}
      </span>
      <div className="w-24 text-right">
        {error ? (
          <span className="text-[10px] font-medium text-red-600">{error}</span>
        ) : (
          <Button type="button" size="sm" variant={saved ? 'outline' : 'holo'} loading={busy} disabled={busy || !ready} onClick={save}>
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </Button>
        )}
      </div>
    </li>
  )
}
