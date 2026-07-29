'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Send, Trash2, Pencil, ExternalLink } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'

/**
 * Row actions for one of a partner's programmes. Which actions apply depends on
 * where the programme sits in the review lifecycle.
 */
export function ProgrammeActions({
  id,
  status,
  title,
  slug,
}: {
  id: string
  status: string
  title: string
  slug: string
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<'submit' | 'delete' | null>(null)
  const [error, setError] = React.useState('')

  const canSubmit = status === 'DRAFT' || status === 'REJECTED'
  const canDelete = status === 'DRAFT' || status === 'REJECTED'
  const isLive = status === 'PUBLISHED'

  async function submit() {
    if (!window.confirm(`Submit "${title}" for review? Our team will check it before it goes live.`)) return
    setBusy('submit')
    setError('')
    try {
      const res = await fetch(`/api/partner/programmes/${id}/submit`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not submit.')
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return
    setBusy('delete')
    setError('')
    try {
      const res = await fetch(`/api/partner/programmes/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not delete.')
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
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {isLive && (
          <Link
            href={`/courses/${slug}`}
            target="_blank"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View live
          </Link>
        )}
        <Link
          href={`/partner/programmes/${id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={remove}
            loading={busy === 'delete'}
            disabled={!!busy}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
          >
            {busy !== 'delete' && <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        )}
        {canSubmit && (
          <Button size="sm" variant="holo" onClick={submit} loading={busy === 'submit'} disabled={!!busy}>
            {busy !== 'submit' && <Send className="h-3.5 w-3.5" />}
            Submit for review
          </Button>
        )}
      </div>
    </div>
  )
}
