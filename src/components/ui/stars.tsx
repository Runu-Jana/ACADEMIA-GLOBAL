import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stars({
  rating,
  count,
  size = 13,
  className,
  showValue = true,
}: {
  rating: number
  count?: number
  size?: number
  className?: string
  showValue?: boolean
}) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75
  const rounded = rating - full >= 0.75 ? full + 1 : full

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="inline-flex" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < rounded || (hasHalf && i === full)
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(
                filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300 dark:text-slate-600',
              )}
              strokeWidth={2}
            />
          )
        })}
      </span>
      {showValue && <span className="text-[13px] font-bold">{rating.toFixed(1)}</span>}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count.toLocaleString('en-IN')})</span>
      )}
      <span className="sr-only">{rating.toFixed(1)} out of 5</span>
    </span>
  )
}
