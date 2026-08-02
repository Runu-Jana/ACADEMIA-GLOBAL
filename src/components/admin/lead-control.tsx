'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** The next step in the pipeline for a one-click advance. */
const NEXT: Record<string, string> = {
  NEW: 'CONTACTED',
  CONTACTED: 'QUALIFIED',
  QUALIFIED: 'CONVERTED',
}

export function LeadControl({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not update this lead.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  const advance = NEXT[status]
  const closed = status === 'CONVERTED' || status === 'LOST'

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error && <span className="mr-1 text-[11px] font-medium text-red-600">{error}</span>}

      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          const n = window.prompt('Add a note (call outcome, next follow-up):')
          if (n && n.trim()) patch({ note: n.trim() })
        }}
      >
        <StickyNote className="h-3.5 w-3.5" />
        Note
      </Button>

      {advance && (
        <Button size="sm" variant="holo" disabled={busy} onClick={() => patch({ status: advance })}>
          <Check className="h-3.5 w-3.5" />
          {advance === 'CONVERTED' ? 'Mark converted' : `Mark ${advance.toLowerCase()}`}
        </Button>
      )}

      {!closed && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Mark this lead as lost?')) patch({ status: 'LOST' })
          }}
          className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-red-600 disabled:opacity-50"
        >
          Lost
        </button>
      )}
    </div>
  )
}
