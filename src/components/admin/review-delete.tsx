'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

/** One-click removal of an abusive/off-topic learner review. */
export function ReviewDelete({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function remove() {
    if (!window.confirm('Remove this review? It will disappear from the course page.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Remove
    </button>
  )
}
