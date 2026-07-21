import { cn } from '@/lib/utils'

type Palette = 'brand' | 'holo' | 'warm' | 'cool'

const palettes: Record<Palette, string[]> = {
  brand: ['#3b76f6', '#818cf8', '#22d3ee'],
  holo: ['#22d3ee', '#e879f9', '#818cf8'],
  warm: ['#f97316', '#f59e0b', '#ec4899'],
  cool: ['#38bdf8', '#5eead4', '#818cf8'],
}

/**
 * Decorative blurred colour field. Purely presentational — sits behind content
 * at z-0 and never intercepts pointer events.
 */
export function Aurora({
  palette = 'brand',
  className,
  density = 3,
}: {
  palette?: Palette
  className?: string
  density?: number
}) {
  const colors = palettes[palette]
  const blobs = Array.from({ length: density }, (_, i) => {
    const seeds = [
      { top: '-12%', left: '-8%', size: '46vw', delay: '0s' },
      { top: '18%', right: '-14%', size: '38vw', delay: '-6s' },
      { bottom: '-18%', left: '32%', size: '42vw', delay: '-12s' },
      { top: '48%', left: '4%', size: '30vw', delay: '-3s' },
    ]
    const s = seeds[i % seeds.length]
    return (
      <span
        key={i}
        style={{
          ...s,
          width: s.size,
          height: s.size,
          background: colors[i % colors.length],
          animationDelay: s.delay,
        }}
      />
    )
  })

  return (
    <div aria-hidden className={cn('aurora', className)}>
      {blobs}
    </div>
  )
}

/** Subtle grid used behind hero sections to give the gradients structure. */
export function GridPattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 opacity-[.55]',
        '[background-image:linear-gradient(to_right,rgba(100,116,139,.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,.10)_1px,transparent_1px)]',
        '[background-size:56px_56px]',
        '[mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_50%,transparent_100%)]',
        className,
      )}
    />
  )
}
