'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles, AlertCircle, CheckCircle2, ArrowRight, Loader2, Link2, ClipboardPaste, Building2,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
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
  confidence: 'high' | 'medium' | 'low'
  notes: string | null
  terms: { number: number }[]
}

const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((o) => o.value === v)?.label ?? v

const CONFIDENCE_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
}

export function DirectoryIngest({
  universities,
  configured,
}: {
  universities: { id: string; name: string }[]
  configured: boolean
}) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<'input' | 'review' | 'done'>('input')

  // university target
  const [uniMode, setUniMode] = React.useState<'existing' | 'new'>(
    universities.length ? 'existing' : 'new',
  )
  const [uniId, setUniId] = React.useState(universities[0]?.id ?? '')
  const [newUni, setNewUni] = React.useState({ name: '', city: '', state: '' })

  // source
  const [srcTab, setSrcTab] = React.useState<'url' | 'text'>('url')
  const [url, setUrl] = React.useState('')
  const [text, setText] = React.useState('')

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [programmes, setProgrammes] = React.useState<Extracted[]>([])
  const [warnings, setWarnings] = React.useState<string[]>([])
  const [reviewToken, setReviewToken] = React.useState('')
  const [sourceUrl, setSourceUrl] = React.useState<string | null>(null)
  const [done, setDone] = React.useState<{ count: number; slug: string; name: string } | null>(null)

  const uniReady = uniMode === 'existing' ? Boolean(uniId) : newUni.name.trim().length >= 2

  async function extract() {
    setBusy(true)
    setError('')
    try {
      const body = srcTab === 'url' ? { url: url.trim() } : { text }
      const res = await fetch('/api/admin/directory/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Extraction failed.')
        return
      }
      if (!data.programmes?.length) {
        setError('No programmes could be extracted. Try a different page or paste the text.')
        return
      }
      setProgrammes(data.programmes)
      setWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      setReviewToken(String(data.reviewToken ?? data.programmes.length))
      setSourceUrl(typeof data.sourceUrl === 'string' ? data.sourceUrl : null)
      setPhase('review')
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function commit() {
    setBusy(true)
    setError('')
    try {
      const university =
        uniMode === 'existing'
          ? { id: uniId }
          : { name: newUni.name.trim(), city: newUni.city.trim(), state: newUni.state.trim(), sourceUrl: sourceUrl ?? undefined }
      const res = await fetch('/api/admin/directory/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ university, programmes, reviewToken, confirm: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not publish these listings.')
        return
      }
      setDone({ count: data.count ?? programmes.length, slug: data.university?.slug ?? '', name: data.university?.name ?? '' })
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
          <p className="font-bold">AI extraction isn&rsquo;t switched on</p>
          <p className="mt-1 text-muted-foreground">
            This environment has no AI key configured. Add an ANTHROPIC_API_KEY (or OPENAI_API_KEY) to
            use the directory scraper.
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'done' && done) {
    return (
      <div className="card-base holo-ring p-6 text-center sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          {done.count} listing{done.count === 1 ? '' : 's'} published
        </h2>
        <p className="mx-auto mt-2 max-w-md text-pretty text-[13.5px] text-muted-foreground">
          Added as directory listings under <strong>{done.name}</strong>. They&rsquo;re display-only —
          a student who shows interest becomes a lead you can steer to a partner.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/universities/${done.slug}`} className={buttonVariants({ variant: 'outline' })}>
            View listing
          </Link>
          <button
            type="button"
            onClick={() => {
              setDone(null)
              setProgrammes([])
              setUrl('')
              setText('')
              setPhase('input')
            }}
            className={buttonVariants({ variant: 'holo' })}
          >
            Import more
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'review') {
    return (
      <div className="space-y-4">
        {error && <ErrorBar message={error} />}
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold">
              Review {programmes.length} extracted programme{programmes.length === 1 ? '' : 's'}
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              Nothing is saved yet. Publishing adds these as directory listings under{' '}
              <strong>{uniMode === 'existing' ? universities.find((u) => u.id === uniId)?.name : newUni.name}</strong>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPhase('input')} disabled={busy}>
              Back
            </Button>
            <Button variant="holo" onClick={commit} loading={busy}>
              {!busy && <CheckCircle2 className="h-4 w-4" />}
              Publish to directory
            </Button>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="mb-1 font-bold">Before you publish:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
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
                {p.feePerYear != null ? (
                  `${formatINR(p.feePerYear)}/yr`
                ) : (
                  <span className="text-amber-600">fee not stated</span>
                )}
              </p>
              {p.notes && <p className="mt-1.5 text-[11.5px] italic text-muted-foreground">Note: {p.notes}</p>}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // ------------------------------------------------------------------ input
  return (
    <div className="space-y-5">
      {error && <ErrorBar message={error} />}

      {/* -------------------------------------------------- 1. university */}
      <div className="card-base p-4">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold">
          <Building2 className="h-4 w-4 text-primary-500" />
          1 · Which institution?
        </h2>
        <div className="mb-3 inline-flex gap-1 rounded-xl border border-border bg-muted/60 p-1">
          {(['existing', 'new'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setUniMode(m)}
              disabled={m === 'existing' && universities.length === 0}
              className={
                uniMode === m
                  ? 'rounded-lg bg-card px-3 py-1.5 text-[12.5px] font-bold text-primary-700 shadow-soft dark:text-primary-300'
                  : 'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground disabled:opacity-40'
              }
            >
              {m === 'existing' ? 'Existing directory listing' : 'New institution'}
            </button>
          ))}
        </div>

        {uniMode === 'existing' ? (
          <Field label="Directory university">
            <Select value={uniId} onChange={(e) => setUniId(e.target.value)}>
              {universities.length === 0 && <option value="">No directory universities yet</option>}
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Institution name" required className="sm:col-span-3">
              <Input value={newUni.name} onChange={(e) => setNewUni((u) => ({ ...u, name: e.target.value }))} placeholder="e.g. Anna University" maxLength={120} />
            </Field>
            <Field label="City">
              <Input value={newUni.city} onChange={(e) => setNewUni((u) => ({ ...u, city: e.target.value }))} placeholder="Chennai" />
            </Field>
            <Field label="State">
              <Input value={newUni.state} onChange={(e) => setNewUni((u) => ({ ...u, state: e.target.value }))} placeholder="Tamil Nadu" />
            </Field>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------- 2. source */}
      <div className="card-base p-4">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold">
          <Sparkles className="h-4 w-4 text-primary-500" />
          2 · Where&rsquo;s the course data?
        </h2>
        <div className="mb-3 inline-flex gap-1 rounded-xl border border-border bg-muted/60 p-1">
          {(['url', 'text'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSrcTab(t)}
              className={
                srcTab === t
                  ? 'inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-[12.5px] font-bold text-primary-700 shadow-soft dark:text-primary-300'
                  : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground'
              }
            >
              {t === 'url' ? <Link2 className="h-3.5 w-3.5" /> : <ClipboardPaste className="h-3.5 w-3.5" />}
              {t === 'url' ? 'From a URL' : 'Paste text'}
            </button>
          ))}
        </div>

        {busy ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-[13.5px] font-semibold">Reading the page and extracting programmes…</p>
          </div>
        ) : srcTab === 'url' ? (
          <Field label="Course / programmes page URL" hint="A server-rendered page works best; paste text if the site is JS-heavy.">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://university.edu/programmes" />
          </Field>
        ) : (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] font-mono text-[12.5px]"
            placeholder="Paste the programme list / prospectus text here…"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          Facts only — the AI leaves anything the source doesn&rsquo;t state blank. You review before
          publishing, and listings are labelled &ldquo;not affiliated&rdquo;.
        </p>
        <Button
          variant="holo"
          onClick={extract}
          disabled={busy || !uniReady || (srcTab === 'url' ? !url.trim() : text.trim().length < 200)}
        >
          <Sparkles className="h-4 w-4" />
          Extract programmes
        </Button>
      </div>
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
