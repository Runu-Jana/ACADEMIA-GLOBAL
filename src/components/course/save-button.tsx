'use client'

import * as React from 'react'
import { Heart } from 'lucide-react'
import { useSaved } from '@/lib/use-saved'
import { cn } from '@/lib/utils'

/**
 * A heart that toggles a course in the student's saved list.
 *
 * `icon` is the overlay used on a card (it sits on top of a Link, so it stops
 * the click from navigating); `chip` is the labelled button for a detail page.
 * A signed-out visitor who taps it is sent to sign in and returned here.
 */
export function SaveButton({
  courseId,
  variant = 'icon',
  className,
}: {
  courseId: string
  variant?: 'icon' | 'chip'
  className?: string
}) {
  const { isSaved, toggle } = useSaved()
  const saved = isSaved(courseId)

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggle(courseId)
  }

  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
          saved
            ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
            : 'border-border text-muted-foreground hover:border-primary-300 hover:text-primary-600',
          className,
        )}
      >
        <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
        {saved ? 'Saved' : 'Save'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save course'}
      title={saved ? 'Saved' : 'Save course'}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full backdrop-blur-sm transition-all duration-200',
        saved
          ? 'bg-white/90 text-rose-600 shadow-soft dark:bg-slate-900/85 dark:text-rose-300'
          : 'bg-black/35 text-white hover:bg-black/55',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4 transition-transform', saved && 'scale-110 fill-current')} />
    </button>
  )
}
