'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, FileText, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* --------------------------------------------------------- promote cool-off */

export function PromoteButton({ ready }: { ready: number }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState('')

  async function run() {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/finance/promote', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(typeof data.error === 'string' ? data.error : 'Could not run promotion.')
        return
      }
      setMsg(`${data.promoted} commission${data.promoted === 1 ? '' : 's'} now claimable`)
      router.refresh()
    } catch {
      setMsg('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={run} loading={busy} disabled={busy || ready === 0}>
        {!busy && <RefreshCw className="h-3.5 w-3.5" />}
        {ready > 0 ? `Promote ${ready} past cool-off` : 'Nothing to promote'}
      </Button>
      {msg && <span className="text-[11.5px] font-medium text-muted-foreground">{msg}</span>}
    </div>
  )
}

/* ------------------------------------------------------------- create payout */

export function CreatePayoutButton({
  universityId,
  claimable,
}: {
  universityId: string
  claimable: number
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState('')

  async function run() {
    if (!window.confirm('Draft an invoice batching every claimable commission for this partner?')) {
      return
    }
    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universityId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not create the payout.')
        return
      }
      router.refresh()
    } catch {
      setErr('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="flex items-center justify-end gap-2">
      {err && <span className="text-[11px] font-medium text-red-600">{err}</span>}
      <Button size="sm" variant="holo" onClick={run} loading={busy} disabled={busy || claimable <= 0}>
        {!busy && <FileText className="h-3.5 w-3.5" />}
        Create payout
      </Button>
    </span>
  )
}

/* -------------------------------------------------------- payout lifecycle */

type Action = 'invoice' | 'paid' | 'dispute'

export function PayoutStatusControl({ payoutId, status }: { payoutId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<Action | null>(null)
  const [err, setErr] = React.useState('')

  async function act(action: Action) {
    let invoiceNo: string | undefined
    if (action === 'invoice') {
      const input = window.prompt('Invoice number (optional):', '')
      if (input === null) return // cancelled
      invoiceNo = input.trim() || undefined
    } else if (action === 'paid') {
      if (!window.confirm('Mark this payout as collected? Its commissions will be settled.')) return
    } else if (action === 'dispute') {
      if (!window.confirm('Flag this payout as disputed for manual follow-up?')) return
    }

    setBusy(action)
    setErr('')
    try {
      const res = await fetch(`/api/admin/finance/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, invoiceNo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not update this payout.')
        return
      }
      router.refresh()
    } catch {
      setErr('Network error — please try again.')
    } finally {
      setBusy(null)
    }
  }

  const buttons: { label: string; action: Action; variant: 'outline' | 'holo'; icon: React.ElementType }[] =
    status === 'DRAFT'
      ? [
          { label: 'Mark invoiced', action: 'invoice', variant: 'outline', icon: FileText },
          { label: 'Mark paid', action: 'paid', variant: 'holo', icon: Check },
        ]
      : status === 'INVOICED'
        ? [
            { label: 'Mark paid', action: 'paid', variant: 'holo', icon: Check },
            { label: 'Dispute', action: 'dispute', variant: 'outline', icon: AlertTriangle },
          ]
        : status === 'DISPUTED'
          ? [{ label: 'Mark paid', action: 'paid', variant: 'holo', icon: Check }]
          : []

  if (!buttons.length) {
    return <span className="text-[11.5px] text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {err && <span className="mr-1 text-[11px] font-medium text-red-600">{err}</span>}
      {buttons.map((b) => {
        const Icon = b.icon
        return (
          <Button
            key={b.action}
            size="sm"
            variant={b.variant}
            onClick={() => act(b.action)}
            loading={busy === b.action}
            disabled={!!busy}
          >
            {busy !== b.action && <Icon className="h-3.5 w-3.5" />}
            {b.label}
          </Button>
        )
      })}
    </div>
  )
}
