'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Truck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'

/** Forward-only fulfilment ladder, mirrored from the API's NEXT map. */
const NEXT_STEP: Record<string, { status: string; label: string } | null> = {
  PENDING: null,
  PAID: { status: 'PACKED', label: 'Mark packed' },
  PACKED: { status: 'SHIPPED', label: 'Mark shipped' },
  SHIPPED: { status: 'DELIVERED', label: 'Mark delivered' },
  DELIVERED: null,
  CANCELLED: null,
  REFUNDED: null,
}

/**
 * Fulfilment actions for one order.
 *
 * Moving to SHIPPED asks for a tracking number first — a "shipped" email with no
 * way to track it just generates a support ticket.
 */
export function ShopOrderControls({
  orderId,
  status,
  courier,
  trackingNumber,
}: {
  orderId: string
  status: string
  courier: string | null
  trackingNumber: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [showShip, setShowShip] = React.useState(false)
  const [courierVal, setCourierVal] = React.useState(courier ?? '')
  const [trackingVal, setTrackingVal] = React.useState(trackingNumber ?? '')

  const next = NEXT_STEP[status]
  const canClose = ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/shop/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not update the order.')
        setBusy(false)
        return
      }
      setShowShip(false)
      router.refresh()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-[12px] font-semibold text-red-600 dark:text-red-400">{error}</p>}

      {showShip ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-2.5">
          <Input
            value={courierVal}
            onChange={(e) => setCourierVal(e.target.value)}
            placeholder="Courier (e.g. Delhivery)"
            maxLength={80}
          />
          <Input
            value={trackingVal}
            onChange={(e) => setTrackingVal(e.target.value)}
            placeholder="Tracking number"
            maxLength={80}
          />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="flex-1"
              loading={busy}
              disabled={busy || !trackingVal.trim()}
              onClick={() =>
                patch({ status: 'SHIPPED', courier: courierVal.trim(), trackingNumber: trackingVal.trim() })
              }
            >
              <Check className="h-3.5 w-3.5" />
              Confirm shipped
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowShip(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {next && (
            <Button
              size="sm"
              loading={busy}
              disabled={busy}
              onClick={() => (next.status === 'SHIPPED' ? setShowShip(true) : patch({ status: next.status }))}
            >
              {next.status === 'SHIPPED' ? <Truck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              {next.label}
            </Button>
          )}

          {canClose && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (confirm('Refund this order? Stock will be returned to inventory.')) {
                  patch({ status: 'REFUNDED' })
                }
              }}
            >
              Refund
            </Button>
          )}

          {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
        </div>
      )}
    </div>
  )
}
