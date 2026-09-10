'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Star, Trash2, PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { cn } from '@/lib/utils'

type Existing = { rating: number; body: string } | null

/**
 * Write / edit a learner's own review for a course. Only rendered for an
 * enrolled learner (the server gates on enrolment and re-checks on submit).
 * The star row is a real radio group so it works with a keyboard and a screen
 * reader, not just a mouse.
 */
export function ReviewForm({ courseId, existing }: { courseId: string; existing: Existing }) {
  const router = useRouter()
  const [rating, setRating] = React.useState(existing?.rating ?? 0)
  const [hover, setHover] = React.useState(0)
  const [body, setBody] = React.useState(existing?.body ?? '')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [open, setOpen] = React.useState(!existing)

  const editing = Boolean(existing)
  const shown = hover || rating

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (rating < 1) return setError('Please pick a star rating.')
    if (body.trim().length < 10) return setError('Please write at least 10 characters.')

    setBusy(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, rating, body: body.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not save your review. Please try again.')
        setBusy(false)
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Could not save your review. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/reviews?courseId=${encodeURIComponent(courseId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Could not remove your review.')
        setBusy(false)
        return
      }
      setRating(0)
      setBody('')
      setOpen(true)
      router.refresh()
    } catch {
      setError('Could not remove your review.')
      setBusy(false)
    }
  }

  // Collapsed state once a review exists — a compact "edit" affordance rather
  // than a form that competes with the reviews it sits above.
  if (editing && !open) {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-500/25 dark:bg-primary-500/10">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-bold">Your review</span>
          <span className="inline-flex" aria-label={`${existing!.rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                width={14}
                height={14}
                className={cn(
                  i < existing!.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-slate-300 dark:text-slate-600',
                )}
              />
            ))}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary-600 hover:underline"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-xl border border-border bg-card p-4"
    >
      <p className="text-[13px] font-bold">{editing ? 'Edit your review' : 'Write a review'}</p>

      <div
        role="radiogroup"
        aria-label="Your rating"
        className="mt-2.5 flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => setRating(n)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              width={26}
              height={26}
              className={cn(
                'transition-colors',
                n <= shown
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-slate-300 dark:text-slate-600',
              )}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="What stood out about the teaching, materials or support? Share what would help another learner decide."
        className="mt-3"
      />
      <p className="mt-1 text-right text-[11px] text-muted-foreground">{body.length}/1000</p>

      {error && (
        <p role="alert" className="mt-1 text-[12.5px] font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" loading={busy} disabled={busy}>
          {editing ? 'Update review' : 'Post review'}
        </Button>
        {editing && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </>
        )}
      </div>
    </form>
  )
}
