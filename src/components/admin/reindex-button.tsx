'use client'

import * as React from 'react'
import { Sparkles, Check, AlertCircle, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Rebuilds a course's AI tutor retrieval index on demand.
 *
 * Indexing isn't automatic on every content edit — it's an explicit admin
 * action so a half-finished syllabus edit doesn't churn embeddings, and so the
 * cost of re-embedding is a decision rather than a surprise.
 */
export function ReindexButton({
  courseId,
  initialChunks,
}: {
  courseId: string
  initialChunks: number
}) {
  const [chunks, setChunks] = React.useState(initialChunks)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null)

  async function reindex() {
    if (busy) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/reindex`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult({ ok: false, text: typeof data.error === 'string' ? data.error : 'Indexing failed.' })
        return
      }
      setChunks(data.chunks ?? 0)
      setResult({
        ok: true,
        text: `${data.chunks} chunks indexed · ${data.embedded ? 'semantic (embedded)' : 'lexical (no embeddings key)'}`,
      })
    } catch {
      setResult({ ok: false, text: 'Network error — please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-base p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
            <Database className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold">Sarthi (AI tutor) index</p>
            <p className="text-[11.5px] text-muted-foreground">
              {chunks > 0
                ? `${chunks} passage${chunks === 1 ? '' : 's'} indexed for the course tutor.`
                : 'Not indexed yet — the tutor has nothing to retrieve from.'}
            </p>
          </div>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={reindex} loading={busy}>
          {!busy && <Sparkles className="h-3.5 w-3.5" />}
          {chunks > 0 ? 'Rebuild index' : 'Build index'}
        </Button>
      </div>

      {result && (
        <p
          className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-[12px] font-medium ${
            result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
          }`}
        >
          {result.ok ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {result.text}
        </p>
      )}
    </div>
  )
}
