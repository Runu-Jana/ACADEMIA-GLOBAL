'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/** Failsafe: never leave content invisible if the observer misbehaves. */
const FAILSAFE_MS = 2000

/**
 * Scroll-reveal that degrades safely.
 *
 * Content renders VISIBLE on the server and stays visible without JavaScript.
 * Only once JS confirms it can drive the animation do we hide an element — and
 * only if it starts below the fold, so above-the-fold content never flashes.
 * A timeout backstops the observer, so a missed callback can't leave the page
 * blank (a backgrounded tab, for instance, can suppress IntersectionObserver).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  once = true,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
  as?: React.ElementType
}) {
  const ref = React.useRef<HTMLElement>(null)
  // 'static' = no animation at all (SSR, no-JS, reduced motion, above the fold).
  const [state, setState] = React.useState<'static' | 'hidden' | 'shown'>('static')

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Already on screen — show it as-is rather than animating on load.
    if (el.getBoundingClientRect().top < window.innerHeight) return

    setState('hidden')

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown')
          if (once) io.unobserve(el)
        } else if (!once) {
          setState('hidden')
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )

    io.observe(el)
    const failsafe = setTimeout(() => setState('shown'), FAILSAFE_MS + delay)

    return () => {
      io.disconnect()
      clearTimeout(failsafe)
    }
  }, [once, delay])

  const animated = state !== 'static'

  return (
    <Tag
      ref={ref}
      className={cn(animated && 'transition-all duration-700 ease-spring will-change-transform', className)}
      style={
        animated
          ? {
              opacity: state === 'shown' ? 1 : 0,
              transform: state === 'shown' ? 'translateY(0)' : `translateY(${y}px)`,
              transitionDelay: `${delay}ms`,
            }
          : undefined
      }
    >
      {children}
    </Tag>
  )
}

/** Staggers Reveal across a list of children. */
export function RevealGroup({
  children,
  className,
  step = 70,
  initialDelay = 0,
}: {
  children: React.ReactNode
  className?: string
  step?: number
  initialDelay?: number
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <Reveal delay={initialDelay + i * step}>{child}</Reveal>
      ))}
    </div>
  )
}
