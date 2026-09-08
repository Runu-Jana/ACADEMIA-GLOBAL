'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Check, X, Trash2, RotateCcw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Checkbox } from '@/components/ui/field'

type Draft = {
  text: string
  options: string[]
  correctIndex: number
  marks: string
  explanation: string | null
  include: boolean
}

type ApiQuestion = {
  text: string
  options: string[]
  correctIndex: number
  explanation: string | null
}

/**
 * Drafts test questions with AI, then hands them to a human to vet.
 *
 * The generate step never saves anything — it returns candidates the admin can
 * edit, re-key or drop. Only "Add selected" writes, and it goes through the same
 * validation the manual editor uses. The gate is deliberate: an unreviewed
 * answer key is how a generated quiz marks the right answer wrong.
 */
export function AssessmentGenerator({ testId }: { testId: string }) {
  const router = useRouter()

  const [count, setCount] = React.useState('5')
  const [difficulty, setDifficulty] = React.useState('mixed')
  const [focus, setFocus] = React.useState('')

  const [drafts, setDrafts] = React.useState<Draft[] | null>(null)
  const [generating, setGenerating] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [error, setError] = React.useState('')

  const patch = (i: number, next: Partial<Draft>) =>
    setDrafts((ds) => ds?.map((d, j) => (j === i ? { ...d, ...next } : d)) ?? ds)

  async function generate() {
    if (generating) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/tests/${testId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: Number(count), difficulty, focus: focus.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not generate questions.')
        return
      }
      const next: Draft[] = (data.questions as ApiQuestion[]).map((q) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        marks: '1',
        explanation: q.explanation,
        include: true,
      }))
      setDrafts(next)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setGenerating(false)
    }
  }

  /** A draft is addable when its text, every option, and the marked answer are filled. */
  function draftValid(d: Draft) {
    const opts = d.options.map((o) => o.trim())
    return d.text.trim().length > 0 && opts.every((o) => o.length > 0) && !!opts[d.correctIndex]
  }

  const selected = drafts?.filter((d) => d.include) ?? []
  const readyToAdd = selected.length > 0 && selected.every(draftValid)

  async function addSelected() {
    if (!readyToAdd || adding) return
    setAdding(true)
    setError('')
    const payload = selected.map((d) => ({
      text: d.text.trim(),
      options: d.options.map((o) => o.trim()),
      correctIndex: d.correctIndex,
      marks: Number(d.marks) || 1,
    }))
    try {
      const res = await fetch(`/api/admin/tests/${testId}/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not add the questions.')
        return
      }
      setDrafts(null)
      setFocus('')
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="card-base holo-ring mb-5 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-holo-sweep text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-[14px] font-bold leading-tight">Generate with AI</h3>
          <p className="text-[12px] text-muted-foreground">
            Draft questions from this test&apos;s course material, then review before adding.
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* ------------------------------------------------------ controls */}
      <div className="mt-3.5 grid gap-2.5 sm:grid-cols-[auto_auto_1fr]">
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          Questions
          <Select value={count} onChange={(e) => setCount(e.target.value)} aria-label="Number of questions">
            {['3', '5', '8', '10', '12'].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          Difficulty
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
            <option value="mixed">Mixed</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          Focus topic <span className="font-normal">(optional)</span>
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. Newton's laws of motion"
            maxLength={200}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="hidden text-[11.5px] text-muted-foreground sm:block">
          Nothing is saved until you review and add it.
        </p>
        <Button variant="holo" onClick={generate} loading={generating} disabled={generating}>
          {!generating && <Sparkles className="h-4 w-4" />}
          {drafts ? 'Regenerate' : 'Generate questions'}
        </Button>
      </div>

      {/* -------------------------------------------------------- review */}
      {drafts && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13px] font-bold">
              {drafts.length} draft{drafts.length === 1 ? '' : 's'} — review before adding
            </h4>
            <button
              type="button"
              onClick={() => setDrafts(null)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Discard all
            </button>
          </div>

          <ol className="space-y-3">
            {drafts.map((d, i) => (
              <li
                key={i}
                className={
                  'rounded-xl border p-3.5 transition-opacity ' +
                  (d.include ? 'border-border bg-surface' : 'border-dashed border-border bg-muted/40 opacity-60')
                }
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-[12px] font-semibold">
                    <Checkbox checked={d.include} onChange={(e) => patch(i, { include: e.target.checked })} />
                    Draft {i + 1}
                  </label>
                  <div className="flex items-center gap-2.5">
                    <label className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                      Marks
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={d.marks}
                        onChange={(e) => patch(i, { marks: e.target.value })}
                        aria-label={`Marks for draft ${i + 1}`}
                        className="h-8 w-14 rounded-lg border border-input bg-surface px-2 text-sm outline-none focus:border-primary-400"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setDrafts((ds) => ds?.filter((_, j) => j !== i) ?? ds)}
                      aria-label={`Remove draft ${i + 1}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <Textarea
                  value={d.text}
                  onChange={(e) => patch(i, { text: e.target.value })}
                  aria-label={`Draft ${i + 1} question`}
                  className="min-h-[60px]"
                  maxLength={1000}
                />

                <p className="mb-1.5 mt-2.5 text-[11.5px] font-bold text-muted-foreground">
                  Options — select the correct one
                </p>
                <div className="space-y-2">
                  {d.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={d.correctIndex === oi}
                        onChange={() => patch(i, { correctIndex: oi })}
                        aria-label={`Mark option ${oi + 1} correct`}
                        className="h-4 w-4 shrink-0 accent-emerald-600"
                      />
                      <Input
                        value={opt}
                        onChange={(e) =>
                          patch(i, { options: d.options.map((v, j) => (j === oi ? e.target.value : v)) })
                        }
                        aria-label={`Draft ${i + 1} option ${oi + 1}`}
                        className="h-9"
                        maxLength={300}
                      />
                    </div>
                  ))}
                </div>

                {d.explanation && (
                  <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {d.explanation}
                  </p>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-primary-600 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Regenerate
            </button>
            <Button variant="holo" onClick={addSelected} loading={adding} disabled={adding || !readyToAdd}>
              {!adding && <Check className="h-4 w-4" />}
              Add {selected.length} question{selected.length === 1 ? '' : 's'}
            </Button>
          </div>
          {selected.length > 0 && !readyToAdd && (
            <p className="mt-2 text-[11.5px] text-amber-600 dark:text-amber-400">
              A selected draft is missing its question, an option, or its correct answer — fix or deselect it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
