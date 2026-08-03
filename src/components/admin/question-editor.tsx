'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Check, X, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'

export type QuestionData = {
  id: string
  text: string
  options: string[]
  correctIndex: number
  marks: number
}

/**
 * Authors a test's questions. The same form adds a new question or edits an
 * existing one (the correct answer is a radio over the option rows, so it can't
 * point at a deleted or empty option). Server re-fetch after each change keeps
 * the list honest.
 */
export function QuestionEditor({ testId, questions }: { testId: string; questions: QuestionData[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [text, setText] = React.useState('')
  const [options, setOptions] = React.useState<string[]>(['', '', '', ''])
  const [correct, setCorrect] = React.useState(0)
  const [marks, setMarks] = React.useState('1')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  function reset() {
    setEditingId(null)
    setText('')
    setOptions(['', '', '', ''])
    setCorrect(0)
    setMarks('1')
    setError('')
  }

  function startEdit(q: QuestionData) {
    setEditingId(q.id)
    setText(q.text)
    setOptions([...q.options])
    setCorrect(q.correctIndex)
    setMarks(String(q.marks))
    setError('')
  }

  const trimmed = options.map((o) => o.trim())
  const ready = text.trim().length > 0 && trimmed.every((o) => o.length > 0) && trimmed[correct]?.length > 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError('')
    const body = { text: text.trim(), options: trimmed, correctIndex: correct, marks: Number(marks) }
    const url = editingId ? `/api/admin/questions/${editingId}` : `/api/admin/tests/${testId}/questions`
    try {
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not save the question.')
        return
      }
      reset()
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this question?')) return
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (editingId === id) reset()
        router.refresh()
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-5">
      {/* ----------------------------------------------- existing questions */}
      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={q.id} className="card-base p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13.5px] font-semibold">
                <span className="mr-1.5 text-muted-foreground">Q{i + 1}.</span>
                {q.text}
                <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {q.marks} mark{q.marks === 1 ? '' : 's'}
                </span>
              </p>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(q)}
                  aria-label="Edit question"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(q.id)}
                  aria-label="Delete question"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <li
                  key={oi}
                  className={
                    oi === q.correctIndex
                      ? 'flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] text-muted-foreground'
                  }
                >
                  {oi === q.correctIndex && <CircleCheck className="h-3.5 w-3.5 shrink-0" />}
                  {opt}
                </li>
              ))}
            </ul>
          </li>
        ))}
        {questions.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
            No questions yet — add the first one below.
          </li>
        )}
      </ol>

      {/* ------------------------------------------------------- add / edit */}
      <form onSubmit={submit} className="card-base holo-ring p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-bold">{editingId ? 'Edit question' : 'Add a question'}</h3>
          {editingId && (
            <button type="button" onClick={reset} className="text-[12px] font-semibold text-muted-foreground hover:text-foreground">
              <X className="mr-1 inline h-3.5 w-3.5" />
              Cancel edit
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <Field label="Question" required>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What is…?" maxLength={1000} />
        </Field>

        <p className="mb-1.5 mt-3.5 text-[12px] font-bold text-muted-foreground">
          Options — select the correct one
        </p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correct === i}
                onChange={() => setCorrect(i)}
                aria-label={`Mark option ${i + 1} correct`}
                className="h-4 w-4 shrink-0 accent-emerald-600"
              />
              <Input
                value={opt}
                onChange={(e) => setOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={`Option ${i + 1}`}
                maxLength={300}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setOptions((o) => {
                      const next = o.filter((_, j) => j !== i)
                      if (correct >= next.length) setCorrect(next.length - 1)
                      else if (correct === i) setCorrect(0)
                      return next
                    })
                  }
                  aria-label={`Remove option ${i + 1}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            {options.length < 6 && (
              <button
                type="button"
                onClick={() => setOptions((o) => [...o, ''])}
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </button>
            )}
            <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
              Marks
              <input
                type="number"
                min={1}
                max={50}
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="h-9 w-16 rounded-lg border border-input bg-surface px-2 text-sm outline-none focus:border-primary-400"
              />
            </label>
          </div>
          <Button type="submit" variant="holo" loading={busy} disabled={busy || !ready}>
            {!busy && <Check className="h-4 w-4" />}
            {editingId ? 'Save question' : 'Add question'}
          </Button>
        </div>
      </form>
    </div>
  )
}
