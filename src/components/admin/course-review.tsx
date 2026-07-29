'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Approve/reject controls for a programme awaiting review. Reject asks for a
 * note — the partner sees it and needs to know what to fix.
 */
export function CourseReviewControl({ courseId, title }: { courseId: string; title: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<'approve' | 'reject' | null>(null)
  const [error, setError] = React.useState('')

  async function act(action: 'approve' | 'reject') {
    let note: string | undefined
    if (action === 'reject') {
      const reason = window.prompt(`What should the partner change about "${title}"?`)
      if (reason === null) return
      note = reason.trim() || undefined
      if (!note && !window.confirm('Reject without a note? The partner won’t know what to change.')) {
        return
      }
    } else if (!window.confirm(`Approve "${title}"? It goes live for students immediately.`)) {
      return
    }

    setBusy(action)
    setError('')
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not update this programme.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      <div className="flex items-center justify-end gap-1.5">
        <Button size="sm" variant="outline" onClick={() => act('reject')} loading={busy === 'reject'} disabled={!!busy}>
          {busy !== 'reject' && <X className="h-3.5 w-3.5" />}
          Reject
        </Button>
        <Button size="sm" variant="holo" onClick={() => act('approve')} loading={busy === 'approve'} disabled={!!busy}>
          {busy !== 'approve' && <Check className="h-3.5 w-3.5" />}
          Approve
        </Button>
      </div>
    </div>
  )
}
