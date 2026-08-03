'use client'

import * as React from 'react'

/**
 * Smart scroll to the results grid.
 *
 * When a visitor arrives with a category or filter already in the URL — e.g.
 * from a "Medical" / "Engineering" nav link — glide them straight to the results
 * instead of leaving them at the top of the hero to scroll down themselves. The
 * `signature` is the serialised filter query, so it also re-fires when they pick
 * a different category while already on the page. A bare `/courses` visit has an
 * empty signature, so the hero stays put and nothing jumps.
 *
 * Renders nothing — it only owns the scroll side-effect.
 */
export function SmartScrollToResults({
  targetId,
  signature,
}: {
  targetId: string
  signature: string
}) {
  React.useEffect(() => {
    if (!signature) return
    const el = document.getElementById(targetId)
    if (!el) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // Wait a frame so the fresh results have laid out before we measure.
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(raf)
  }, [targetId, signature])

  return null
}
