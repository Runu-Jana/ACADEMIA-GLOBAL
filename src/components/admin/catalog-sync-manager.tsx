'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Check, X, Loader2, AlertCircle, ExternalLink, Sparkles, PencilLine, Trash2, ArrowRightLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Uni = {
  id: string
  name: string
  sourceUrl: string | null
  syncEnabled: boolean
  syncStatus: string | null
  directoryCourses: number
  lastSyncedAt: string | null
}
type Change = {
  id: string
  kind: string
  title: string
  summary: string
  courseSlug: string | null
  university: string
  createdAt: string
}

export function CatalogSyncManager({
  aiConfigured,
  universities,
  changes,
}: {
  aiConfigured: boolean
  universities: Uni[]
  changes: Change[]
}) {
  const router = useRouter()
  const [urls, setUrls] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(universities.map((u) => [u.id, u.sourceUrl ?? ''])),
  )
  const [busy, setBusy] = React.useState('')
  const [error, setError] = React.useState('')
  const [note, setNote] = React.useState('')

  async function call(url: string, body: unknown): Promise<Record<string, unknown> | null> {
    setError('')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    if (!res) {
      setError('Network error — please try again.')
      return null
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'That action failed.')
      return null
    }
    return data
  }

  async function patch(id: string, body: Record<string, unknown>, key: string) {
    setBusy(key)
    const res = await fetch('/api/admin/catalog-sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universityId: id, ...body }),
    }).catch(() => null)
    if (!res || !res.ok) setError('Could not save. Please try again.')
    else router.refresh()
    setBusy('')
  }

  async function syncNow(id: string, name: string) {
    setBusy('sync-' + id)
    setNote('')
    const data = await call('/api/admin/catalog-sync', { universityId: id })
    if (data?.result) {
      const r = data.result as { added: number; updated: number; queued: number; found: number }
      setNote(`${name}: ${r.found} found — ${r.added} added, ${r.updated} updated, ${r.queued} queued for review.`)
      router.refresh()
    }
    setBusy('')
  }

  async function resolve(id: string, action: 'approve' | 'reject') {
    setBusy('ch-' + id)
    const ok = await call(`/api/admin/catalog-sync/changes/${id}`, { action })
    if (ok) router.refresh()
    setBusy('')
  }

  return (
    <div className="space-y-6">
      {!aiConfigured && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong className="font-bold">AI extraction isn&rsquo;t configured.</strong> Set{' '}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">ANTHROPIC_API_KEY</code> to enable
            scraping &amp; syncing. You can still set source URLs and enable sync now — the daily job
            will start working once the key is added.
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {note && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[13px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          {note}
        </p>
      )}

      {/* --------------------------------------------------- pending review */}
      {changes.length > 0 && (
        <section className="card-base p-4 sm:p-5">
          <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold">
            <ArrowRightLeft className="h-4 w-4 text-primary-600" />
            Changes to review
            <Badge tone="warning">{changes.length}</Badge>
          </h2>
          <p className="mb-3 text-[12.5px] text-muted-foreground">
            Material changes from the last sync — a big fee move, a level/duration change, or a
            programme dropped from the source. Approve to apply, reject to keep the current listing.
          </p>
          <ul className="space-y-2">
            {changes.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={c.kind === 'REMOVE' ? 'danger' : 'primary'}>
                      {c.kind === 'REMOVE' ? <Trash2 className="h-3 w-3" /> : <PencilLine className="h-3 w-3" />}
                      {c.kind === 'REMOVE' ? 'Remove' : 'Update'}
                    </Badge>
                    <span className="text-[13px] font-bold">{c.title}</span>
                    <span className="text-[11px] text-muted-foreground">· {c.university}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">{c.summary}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => resolve(c.id, 'approve')} loading={busy === 'ch-' + c.id} disabled={!!busy}>
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => resolve(c.id, 'reject')} disabled={!!busy}>
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------------------------------------------- source config */}
      <section className="card-base p-4 sm:p-5">
        <h2 className="mb-3 text-[15px] font-bold">Institutions</h2>
        <ul className="space-y-3">
          {universities.map((u) => {
            const dirty = (urls[u.id] ?? '') !== (u.sourceUrl ?? '')
            return (
              <li key={u.id} className="rounded-xl border border-border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {u.directoryCourses} directory course{u.directoryCourses === 1 ? '' : 's'}
                      {u.lastSyncedAt && ` · last synced ${new Date(u.lastSyncedAt).toLocaleString('en-IN')}`}
                    </p>
                    {u.syncStatus && <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{u.syncStatus}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patch(u.id, { syncEnabled: !u.syncEnabled }, 'tog-' + u.id)}
                      disabled={!!busy}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition-colors',
                        u.syncEnabled
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-border text-muted-foreground hover:border-primary-300',
                      )}
                    >
                      {busy === 'tog-' + u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Auto-sync {u.syncEnabled ? 'On' : 'Off'}
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => syncNow(u.id, u.name)}
                      loading={busy === 'sync-' + u.id}
                      disabled={!!busy || !u.sourceUrl}
                      title={!u.sourceUrl ? 'Set a source URL first' : 'Run the sync now'}
                    >
                      Sync now
                    </Button>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Input
                      value={urls[u.id] ?? ''}
                      onChange={(e) => setUrls((s) => ({ ...s, [u.id]: e.target.value }))}
                      placeholder="Official programmes page URL — e.g. https://university.edu/online-programs"
                      className="h-9"
                    />
                  </div>
                  {u.sourceUrl && (
                    <a
                      href={u.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={() => patch(u.id, { sourceUrl: urls[u.id] ?? '' }, 'url-' + u.id)}
                    loading={busy === 'url-' + u.id}
                    disabled={!!busy || !dirty}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save URL
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
