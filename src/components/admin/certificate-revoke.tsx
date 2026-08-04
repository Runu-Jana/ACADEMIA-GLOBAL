'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Ban, RotateCcw } from 'lucide-react'

/** Toggle a certificate's revoked state (revoked serials fail verification). */
export function CertificateRevoke({ id, revoked }: { id: string; revoked: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function toggle() {
    const next = !revoked
    if (next && !window.confirm('Revoke this certificate? It will fail public verification until restored.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/certificates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoked: next }),
      })
      if (res.ok) router.refresh()
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  return revoked ? (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-50"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Restore
    </button>
  ) : (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
    >
      <Ban className="h-3.5 w-3.5" />
      Revoke
    </button>
  )
}
