'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  Download, X, Loader2, Check, AlertCircle, Video, FileText, FolderDown, Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

type ManifestLesson = {
  id: string
  title: string
  moduleTitle: string
  durationMin: number
  url: string | null
  poster: string | null
}
type ManifestMaterial = {
  id: string
  title: string
  type: string
  fileName: string
  fileSize: number
  url: string
}
type Manifest = {
  title: string
  lessons: ManifestLesson[]
  materials: ManifestMaterial[]
}

type ItemState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Learner-facing "Save offline" panel. It reads the course's offline manifest
 * (/api/courses/[id]/offline — the same contract the native app uses) and lets
 * the learner download each downloadable lesson and material to their device.
 *
 * In a browser this saves files to the device's downloads; in the Shiksha Sarthi
 * mobile app the same manifest drives true in-app offline storage and playback.
 */
export function OfflineDownloads({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [manifest, setManifest] = React.useState<Manifest | null>(null)
  const [states, setStates] = React.useState<Record<string, ItemState>>({})

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open || manifest) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/courses/${courseId}/offline`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? 'Could not load downloads')
        return data as Manifest
      })
      .then((data) => {
        if (!cancelled) setManifest(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load downloads')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, manifest, courseId])

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function save(id: string, url: string, filename: string) {
    setStates((s) => ({ ...s, [id]: 'saving' }))
    try {
      // Fetch as a blob so the browser saves the file (rather than navigating to
      // it); falls back to a plain anchor when the origin blocks a CORS fetch.
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      anchor(objectUrl, filename)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
      setStates((s) => ({ ...s, [id]: 'saved' }))
    } catch {
      try {
        anchor(url, filename)
        setStates((s) => ({ ...s, [id]: 'saved' }))
      } catch {
        setStates((s) => ({ ...s, [id]: 'error' }))
      }
    }
  }

  async function saveAll() {
    if (!manifest) return
    for (const l of manifest.lessons) if (l.url) await save(`l-${l.id}`, l.url, filenameFor(l.title, l.url))
    for (const m of manifest.materials) await save(`m-${m.id}`, m.url, m.fileName)
  }

  const lessons = manifest?.lessons.filter((l) => l.url) ?? []
  const materials = manifest?.materials ?? []
  const total = lessons.length + materials.length

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <FolderDown className="h-4 w-4" />
        Save offline
      </Button>

      {mounted && open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Download ${courseTitle} for offline`}
            className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

            <div className="card-base holo-ring relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden sm:rounded-2xl">
              <div className="flex items-center gap-2 border-b border-border p-4">
                <FolderDown className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold">Save for offline</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {loading && (
                  <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading available downloads…
                  </p>
                )}

                {error && !loading && (
                  <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </p>
                )}

                {!loading && !error && total === 0 && (
                  <div className="py-8 text-center">
                    <Video className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-semibold">Nothing to download yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-muted-foreground">
                      Offline downloads become available once this course’s videos and materials are
                      published with a downloadable source.
                    </p>
                  </div>
                )}

                {!loading && !error && total > 0 && (
                  <div className="space-y-5">
                    {lessons.length > 0 && (
                      <section>
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Lessons ({lessons.length})
                        </h3>
                        <ul className="space-y-2">
                          {lessons.map((l) => (
                            <Row
                              key={l.id}
                              icon={<Video className="h-4 w-4" />}
                              title={l.title}
                              sub={`${l.moduleTitle} · ${l.durationMin} min`}
                              state={states[`l-${l.id}`] ?? 'idle'}
                              onSave={() => l.url && save(`l-${l.id}`, l.url, filenameFor(l.title, l.url))}
                            />
                          ))}
                        </ul>
                      </section>
                    )}

                    {materials.length > 0 && (
                      <section>
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Study material ({materials.length})
                        </h3>
                        <ul className="space-y-2">
                          {materials.map((m) => (
                            <Row
                              key={m.id}
                              icon={<FileText className="h-4 w-4" />}
                              title={m.title}
                              sub={`${m.type} · ${formatBytes(m.fileSize)}`}
                              state={states[`m-${m.id}`] ?? 'idle'}
                              onSave={() => save(`m-${m.id}`, m.url, m.fileName)}
                            />
                          ))}
                        </ul>
                      </section>
                    )}

                    <p className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
                      <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Files save to your device. In the Shiksha Sarthi app they’re stored for offline
                      playback inside the course.
                    </p>
                  </div>
                )}
              </div>

              {!loading && !error && total > 0 && (
                <div className="border-t border-border p-3">
                  <Button type="button" variant="holo" onClick={saveAll} className="w-full">
                    <Download className="h-4 w-4" />
                    Download all ({total})
                  </Button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function Row({
  icon,
  title,
  sub,
  state,
  onSave,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  state: ItemState
  onSave: () => void
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border p-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 block text-[13px] font-semibold">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{sub}</span>
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={state === 'saving'}
        aria-label={`Download ${title}`}
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors',
          state === 'saved'
            ? 'border-emerald-300 text-emerald-600'
            : state === 'error'
              ? 'border-red-300 text-red-600'
              : 'border-border text-muted-foreground hover:border-primary-300 hover:text-primary-600',
        )}
      >
        {state === 'saving' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === 'saved' ? (
          <Check className="h-4 w-4" />
        ) : state === 'error' ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </button>
    </li>
  )
}

/** Trigger a browser download (or navigation) for a URL with a filename hint. */
function anchor(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** A safe download filename from a lesson title + the URL's extension. */
function filenameFor(title: string, url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  const base = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'lesson'
  return ext && ext.length <= 4 ? `${base}.${ext}` : `${base}.mp4`
}
