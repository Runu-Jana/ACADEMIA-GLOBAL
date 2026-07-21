'use client'

import * as React from 'react'
import { formatCount } from '@/lib/utils'

/** Failsafe: never leave a stat reading zero if the observer misbehaves. */
const FAILSAFE_MS = 2000

/**
 * Counts up to `to` when scrolled into view.
 *
 * Renders the FINAL value on the server and without JavaScript — a stat that
 * reads "0+ Universities" because an observer never fired looks broken, so the
 * true value is the default and the animation is the enhancement.
 *
 * `format` is a string, not a callback, so server components can render this
 * directly — React can't serialise functions across the server/client boundary.
 */
export function CountUp({
  to,
  duration = 1600,
  format = 'number',
  suffix = '',
  className,
}: {
  to: number
  duration?: number
  format?: 'number' | 'compact'
  suffix?: string
  className?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [value, setValue] = React.useState(to)
  const started = React.useRef(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    let failsafe: ReturnType<typeof setTimeout>

    const run = () => {
      if (started.current) return
      started.current = true
      const start = performance.now()
      const tick = (now: number) => {
        // Clamp BOTH ends: the first rAF timestamp can predate the
        // performance.now() captured just above, and a negative t sends
        // easeOutExpo below zero — rendering "-799+" for a moment.
        const t = Math.min(Math.max((now - start) / duration, 0), 1)
        // easeOutExpo — fast start, gentle settle.
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        setValue(to * eased)
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    // Rewind to zero only once we know we can animate back up.
    setValue(0)
    // Unconditionally land on the true value. Covers both "observer never
    // fired" and "rAF was throttled mid-count" (background tabs), either of
    // which would otherwise strand the stat on a plausible but wrong number.
    failsafe = setTimeout(() => {
      cancelAnimationFrame(frame)
      setValue(to)
    }, FAILSAFE_MS + duration)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.unobserve(el)
        run()
      },
      { threshold: 0.4 },
    )
    io.observe(el)

    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(failsafe)
    }
  }, [to, duration])

  const rounded = Math.round(value)
  const shown = format === 'compact' ? formatCount(rounded) : rounded.toLocaleString('en-IN')

  return (
    <span ref={ref} className={className}>
      {shown}
      {suffix}
    </span>
  )
}
