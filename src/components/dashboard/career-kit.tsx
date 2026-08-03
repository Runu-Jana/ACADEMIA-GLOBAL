'use client'

import * as React from 'react'
import { Sparkles, AlertCircle, Info, ShieldCheck, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { TOOL_CONFIGS, type ToolConfig } from '@/lib/career-kit-tools'
import type { AiDoc } from '@/lib/ai/career-kit'

/**
 * One panel drives all four Career Kit tools. It reads its shape from the tool's
 * config (fields, labels, endpoint via `feature`) and renders the shared <CareerDoc>
 * for whatever comes back — so a new tool is a config entry, not a new component.
 */
export function CareerKitTool({
  configKey,
  aiConfigured,
  recordSummary,
}: {
  configKey: keyof typeof TOOL_CONFIGS
  aiConfigured: boolean
  recordSummary: string
}) {
  const config = TOOL_CONFIGS[configKey]
  const [form, setForm] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((f) => [f.name, f.default ?? ''])),
  )
  const [doc, setDoc] = React.useState<AiDoc | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [name]: e.target.value }))

  const missingRequired = config.fields.some((f) => f.required && !form[f.name]?.trim())

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (missingRequired) {
      setError('Please fill in the required fields first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/${config.feature}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not generate this. Please try again.')
        return
      }
      setDoc(data.doc as AiDoc)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
      {/* ------------------------------------------------------------- form */}
      <form onSubmit={generate} className="card-base h-max p-4 sm:p-5 lg:sticky lg:top-[84px]">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-holo-sweep">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </span>
          <div>
            <h2 className="text-[15px] font-bold leading-tight">{config.formTitle}</h2>
            <p className="text-[12px] text-muted-foreground">{config.formSub}</p>
          </div>
        </div>

        {!aiConfigured && (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[12px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This tool isn&rsquo;t configured on this environment yet. An administrator needs to add an API key.
          </p>
        )}

        {error && (
          <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="space-y-3.5">
          {config.fields.map((f) => (
            <Field key={f.name} label={f.label} required={f.required} hint={f.hint}>
              {f.type === 'textarea' ? (
                <Textarea value={form[f.name]} onChange={set(f.name)} placeholder={f.placeholder} maxLength={f.maxLength} />
              ) : f.type === 'select' ? (
                <Select value={form[f.name]} onChange={set(f.name)}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input value={form[f.name]} onChange={set(f.name)} placeholder={f.placeholder} maxLength={f.maxLength} />
              )}
            </Field>
          ))}
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
          {recordSummary} The AI works from this and what you type — it never invents facts you didn&rsquo;t give it.
        </p>

        <Button type="submit" variant="holo" size="lg" loading={loading} disabled={loading || !aiConfigured} className="mt-4 w-full">
          {loading ? config.loadingLabel : doc ? 'Regenerate' : config.submitLabel}
        </Button>
      </form>

      {/* ----------------------------------------------------------- result */}
      <div className="min-w-0">
        {doc ? (
          <CareerDoc doc={doc} />
        ) : (
          <EmptyState config={config} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ config }: { config: ToolConfig }) {
  const Icon = config.icon
  return (
    <div className="card-base flex min-h-[24rem] flex-col items-center justify-center p-8 text-center">
      <span className={`mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${config.accent} text-white shadow-glow`}>
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="text-[17px] font-bold">{config.emptyTitle}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-pretty text-[13.5px] text-muted-foreground">{config.emptyBody}</p>
    </div>
  )
}

/* --------------------------------------------------------------- renderer */

function docToText(doc: AiDoc): string {
  const lines: string[] = [doc.title]
  if (doc.intro) lines.push('', doc.intro)
  for (const s of doc.sections) {
    lines.push('', s.heading)
    if (s.body) lines.push(s.body)
    for (const b of s.bullets) lines.push(`• ${b}`)
    for (const g of s.groups) {
      lines.push(`${g.label}:`)
      for (const it of g.items) lines.push(`  - ${it}`)
    }
  }
  if (doc.note) lines.push('', doc.note)
  return lines.join('\n')
}

export function CareerDoc({ doc }: { doc: AiDoc }) {
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(docToText(doc))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked — nothing to do; the text is still on screen.
    }
  }

  return (
    <article className="card-base p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-balance font-display text-xl font-extrabold tracking-tight sm:text-2xl">{doc.title}</h2>
          {doc.intro && <p className="mt-1.5 text-pretty text-[13.5px] text-muted-foreground">{doc.intro}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="mt-5 space-y-5">
        {doc.sections.map((s, i) => (
          <section key={i} className="border-t border-border pt-4 first:border-0 first:pt-0">
            <h3 className="text-[15px] font-bold leading-snug">{s.heading}</h3>
            {s.body && <p className="mt-1.5 text-pretty text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>}

            {s.bullets.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex gap-2 text-[13.5px] leading-relaxed">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {s.groups.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {s.groups.map((g, j) => (
                  <div key={j} className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{g.label}</p>
                    <ul className="space-y-1 text-[13px] leading-relaxed">
                      {g.items.map((it, k) => (
                        <li key={k} className="flex gap-2">
                          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {doc.note && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-[12.5px] font-medium text-primary-800 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {doc.note}
        </p>
      )}
    </article>
  )
}
