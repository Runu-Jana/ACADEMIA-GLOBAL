'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Radio, Square, XCircle, Film, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Per-class operator controls: advance the status, attach a recording, or delete.
 * Which actions show depends on the current state so the lifecycle stays sane.
 */
export function LiveClassControls({
  id,
  status,
  recordingUrl,
}: {
  id: string
  status: string
  recordingUrl: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/live/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data.error === 'string' ? data.error : 'Update failed.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this class? Its attendance records go too.')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/live/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setError('Could not delete.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setBusy(false)
    }
  }

  function addRecording() {
    const url = window.prompt('Recording URL (leave blank to clear):', recordingUrl ?? '')
    if (url === null) return
    patch({ recordingUrl: url.trim(), ...(url.trim() && status !== 'ENDED' ? { status: 'ENDED' } : {}) })
  }

  const closed = status === 'ENDED' || status === 'CANCELLED'

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error && <span className="mr-1 text-[11px] font-medium text-red-600">{error}</span>}

      {status === 'SCHEDULED' && (
        <Button size="sm" variant="holo" disabled={busy} onClick={() => patch({ status: 'LIVE' })}>
          <Radio className="h-3.5 w-3.5" />
          Go live
        </Button>
      )}
      {status === 'LIVE' && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ status: 'ENDED' })}>
          <Square className="h-3.5 w-3.5" />
          End
        </Button>
      )}

      <Button size="sm" variant="ghost" disabled={busy} onClick={addRecording}>
        <Film className="h-3.5 w-3.5" />
        {recordingUrl ? 'Recording' : 'Add recording'}
      </Button>

      {!closed && (
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ status: 'CANCELLED' })}
          className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-amber-600 disabled:opacity-50"
        >
          <XCircle className="mr-1 inline h-3.5 w-3.5" />
          Cancel
        </button>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={remove}
        aria-label="Delete class"
        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
