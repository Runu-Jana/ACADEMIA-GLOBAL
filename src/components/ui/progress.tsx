import { cn } from '@/lib/utils'

export function Progress({
  value,
  className,
  barClassName,
  holo,
}: {
  value: number
  className?: string
  barClassName?: string
  holo?: boolean
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-spring',
          holo ? 'bg-holo-sweep' : 'bg-gradient-to-r from-primary-500 to-primary-600',
          barClassName,
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}

/** Circular progress used on dashboard stat tiles. */
export function ProgressRing({
  value,
  size = 72,
  stroke = 7,
  className,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  className?: string
  children?: React.ReactNode
}) {
  const v = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gradientId = `ring-${size}-${stroke}`

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="stroke-muted" strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={`url(#${gradientId})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <span className="absolute grid place-items-center text-sm font-extrabold">
        {children ?? `${Math.round(v)}%`}
      </span>
    </div>
  )
}
