'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UploadCloud, FileText, Sparkles, AlertCircle, CheckCircle2, ArrowRight, Loader2, ClipboardPaste,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'
import { formatINR } from '@/lib/utils'

type Extracted = {
  title: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number | null
  eligibility: string | null
  about: string | null
  confidence: 'high' | 'medium' | 'low'
  notes: string | null
  terms: { number: number; title: string; subjects: { title: string }[] }[]
}

const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((o) => o.value === v)?.label ?? v

const CONFIDENCE_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
}

export function PartnerIngest({ configured }: { configured: boolean }) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<'input' | 'review' | 'done'>('input')
  const [tab, setTab] = React.useState<'file' | 'text'>('file')
  const [text, setText] = React.useState('')
  const [fileName, setFileName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const [programmes, setProgrammes] = React.useState<Extracted[]>([])
  const [warnings, setWarnings] = React.useState<string[]>([])
  const [reviewToken, setReviewToken] = React.useState('')
  const [createdCount, setCreatedCount] = React.useState(0)

  const fileRef = React.useRef<HTMLInputElement>(null)

  async function extract(payload: FormData | string) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/partner/ingest/extract', {
        method: 'POST',
        ...(typeof payload === 'string'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: payload }) }
          : { body: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Extraction failed.')
        return
      }
      if (!data.programmes?.length) {
        setError('No programmes could be extracted from that document. Try a clearer file or paste the text.')
        return
      }
      setProgrammes(data.programmes)
      setWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      setReviewToken(String(data.reviewToken ?? data.programmes.length))
      setPhase('review')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const fd = new FormData()
    fd.append('file', file)
    extract(fd)
  }

  async function commit() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/partner/ingest/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programmes, reviewToken, confirm: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not import these programmes.')
        return
      }
      setCreatedCount(data.count ?? programmes.length)
      setPhase('done')
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!configured) {
    return (
      <div className="card-base flex items-start gap-3 p-5 text-[13.5px]">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-bold">AI ingestion isn&rsquo;t switched on yet</p>
          <p className="mt-1 text-muted-foreground">
            This environment has no AI key configured, so prospectus extraction is unavailable. You can
            still{' '}
            <Link href="/partner/programmes/new" className="font-semibold text-primary-600 hover:underline">
              add programmes manually
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------ done
  if (phase === 'done') {
    return (
      <div className="card-base holo-ring p-6 text-center sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          {createdCount} draft{createdCount === 1 ? '' : 's'} created
        </h2>
        <p className="mx-auto mt-2 max-w-md text-pretty text-[13.5px] text-muted-foreground">
          They&rsquo;re saved as drafts. Review each one — add fees where the document didn&rsquo;t state
          them — then submit for approval.
        </p>
        <Link href="/partner/programmes" className={buttonVariants({ variant: 'holo', className: 'mt-5' })}>
          Go to my programmes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  // ---------------------------------------------------------------- review
  if (phase === 'review') {
    return (
      <div className="space-y-4">
        {error && <ErrorBar message={error} />}

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold">Review {programmes.length} extracted programme{programmes.length === 1 ? '' : 's'}</h2>
            <p className="text-[12.5px] text-muted-foreground">
              Nothing is saved yet. Import creates drafts you can refine before submitting.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPhase('input')} disabled={busy}>
              Start over
            </Button>
            <Button variant="holo" onClick={commit} loading={busy}>
              {!busy && <CheckCircle2 className="h-4 w-4" />}
              Import as drafts
            </Button>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="mb-1 font-bold">Before you import:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <ul className="space-y-3">
          {programmes.map((p, i) => (
            <li key={i} className="card-base p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[14.5px] font-bold">{p.title}</h3>
                <Badge tone={CONFIDENCE_TONE[p.confidence]}>{p.confidence} confidence</Badge>
              </div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {labelOf(COURSE_LEVELS, p.level)} · {labelOf(COURSE_MODES, p.mode)} ·{' '}
                {labelOf(STREAMS, p.stream)} · {p.durationYears} yr ·{' '}
                {p.feePerYear != null ? `${formatINR(p.feePerYear)}/yr` : <span className="text-amber-600">fee not stated</span>}
                {p.terms.length > 0 && <> · {p.terms.length} term{p.terms.length === 1 ? '' : 's'}</>}
              </p>
              {p.notes && (
                <p className="mt-1.5 text-[11.5px] italic text-muted-foreground">Note: {p.notes}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // ----------------------------------------------------------------- input
  return (
    <div className="space-y-4">
      {error && <ErrorBar message={error} />}

      <div className="inline-flex gap-1 rounded-xl border border-border bg-muted/60 p-1">
        {(['file', 'text'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-[12.5px] font-bold text-primary-700 shadow-soft dark:text-primary-300'
                : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground'
            }
          >
            {t === 'file' ? <UploadCloud className="h-3.5 w-3.5" /> : <ClipboardPaste className="h-3.5 w-3.5" />}
            {t === 'file' ? 'Upload file' : 'Paste text'}
          </button>
        ))}
      </div>

      {busy ? (
        <div className="card-base flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-[13.5px] font-semibold">Reading your prospectus…</p>
          <p className="max-w-xs text-[12px] text-muted-foreground">
            The AI is extracting programmes, semesters and subjects. A long document can take a minute.
          </p>
        </div>
      ) : tab === 'file' ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="card-base flex w-full flex-col items-center gap-3 border-dashed px-6 py-14 text-center transition-colors hover:border-primary-300"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-holo-sweep text-white shadow-glow">
            <UploadCloud className="h-7 w-7" />
          </span>
          <span className="text-[14px] font-bold">Drop in your prospectus PDF</span>
          <span className="max-w-sm text-[12.5px] text-muted-foreground">
            {fileName || 'PDF or text file, up to 20 MB. The AI drafts your programmes; you review before anything is saved.'}
          </span>
          <input ref={fileRef} type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={onFile} className="hidden" />
        </button>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[220px] font-mono text-[12.5px]"
            placeholder="Paste your prospectus or programme list here…"
          />
          <div className="flex justify-end">
            <Button variant="holo" onClick={() => extract(text)} disabled={text.trim().length < 200}>
              <Sparkles className="h-4 w-4" />
              Extract programmes
            </Button>
          </div>
          {text.trim().length > 0 && text.trim().length < 200 && (
            <p className="text-right text-[11.5px] text-muted-foreground">
              Add a bit more text ({text.trim().length}/200 characters minimum).
            </p>
          )}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
        <FileText className="mt-0.5 h-3 w-3 shrink-0" />
        The AI only extracts what your document states — it leaves fees and details blank rather than
        guessing. You review everything before it&rsquo;s saved, and each programme still passes operator
        review before going live.
      </p>
    </div>
  )
}

function ErrorBar({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  )
}
