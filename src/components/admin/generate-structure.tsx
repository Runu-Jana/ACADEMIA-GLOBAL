'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * One-click derivation of a course's semesters + subjects from its modules.
 * Shown only when a course has no academic structure yet.
 */
export function GenerateStructure({ courseId, size = 'sm' }: { courseId: string; size?: 'sm' | 'lg' }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function run() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/academics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not generate the structure.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant="holo" size={size} loading={busy} disabled={busy} onClick={run}>
        {!busy && <Wand2 className="h-4 w-4" />}
        Generate structure
      </Button>
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
    </span>
  )
}
