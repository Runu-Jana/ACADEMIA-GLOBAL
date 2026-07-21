import * as React from 'react'
import { cn } from '@/lib/utils'

type Tone =
  | 'default' | 'primary' | 'success' | 'warning' | 'danger'
  | 'violet' | 'cyan' | 'orange' | 'holo'

const tones: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  primary: 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-500/15 dark:text-primary-200 dark:border-primary-500/25',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
  warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25',
  danger: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25',
  violet: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/25',
  orange: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/25',
  holo: 'border-transparent bg-holo-sweep text-white',
}

export function Badge({
  tone = 'default',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
