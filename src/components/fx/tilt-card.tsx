'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Pointer-tracked 3D tilt with a specular glare that follows the cursor.
 *
 * Transforms are written straight to the DOM node (no state) so a fast pointer
 * sweep doesn't trigger a React render per frame. Disabled for coarse pointers
 * and for users who ask for reduced motion.
 */
export function TiltCard({
  children,
  className,
  innerClassName,
  intensity = 9,
  scale = 1.02,
  glare = true,
}: {
  children: React.ReactNode
  className?: string
  innerClassName?: string
  intensity?: number
  scale?: number
  glare?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = React.useState(false)

  React.useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setEnabled(fine && !calm)
  }, [])

  const handleMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el || !enabled) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      el.style.transform = `rotateX(${(0.5 - py) * intensity}deg) rotateY(${(px - 0.5) * intensity}deg) scale(${scale})`
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
    },
    [enabled, intensity, scale],
  )

  const handleLeave = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)'
  }, [])

  return (
    <div className={cn('tilt-scene', className)}>
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        className={cn('tilt-card relative h-full', innerClassName)}
      >
        {children}
        {glare && enabled && (
          <span
            aria-hidden
            className="tilt-glare pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </div>
    </div>
  )
}
