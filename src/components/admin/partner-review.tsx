'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Approve/reject controls for a pending partner application. Approve is
 * consequential — it creates a University and activates a login — so it
 * confirms first; reject captures an optional note for the record.
 */
export function PartnerReviewControl({
  applicationId,
  name,
}: {
  applicationId: string
  name: string
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<'approve' | 'reject' | null>(null)
  const [error, setError] = React.useState('')

  async function act(action: 'approve' | 'reject') {
    let note: string | undefined
    if (action === 'reject') {
      const reason = window.prompt(`Reject ${name}? You can add an optional note:`)
      if (reason === null) return // cancelled
      note = reason.trim() || undefined
    } else if (
      !window.confirm(
        `Approve ${name}?\n\nThis creates their university profile and activates their partner login so they can submit programmes.`,
      )
    ) {
      return
    }

    setBusy(action)
    setError('')
    try {
      const res = await fetch(`/api/admin/partners/${applicationId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not update this application.')
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
    <div className="flex items-center justify-end gap-1.5">
      {error && <span className="mr-1 text-[11px] font-medium text-red-600">{error}</span>}
      <Button
        size="sm"
        variant="outline"
        onClick={() => act('reject')}
        loading={busy === 'reject'}
        disabled={!!busy}
      >
        {busy !== 'reject' && <X className="h-3.5 w-3.5" />}
        Reject
      </Button>
      <Button
        size="sm"
        variant="holo"
        onClick={() => act('approve')}
        loading={busy === 'approve'}
        disabled={!!busy}
      >
        {busy !== 'approve' && <Check className="h-3.5 w-3.5" />}
        Approve
      </Button>
    </div>
  )
}
