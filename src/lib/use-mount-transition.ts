'use client'

import * as React from 'react'

/**
 * Keeps an element mounted long enough to animate itself out.
 *
 * The problem this solves: a panel rendered as `{open && <Panel/>}` disappears
 * the instant `open` flips false, so an exit transition never gets a chance to
 * run. Entry animations look fine, closing looks like a hard cut.
 *
 * Returns two flags:
 *   `mounted` — render the element at all (stays true through the exit)
 *   `visible` — drive the transition classes (open vs closed position)
 *
 * On open we mount first and only flip `visible` on a later frame, so the
 * browser paints the closed state once and has something to animate *from*.
 * Flipping both in the same commit would land the element at its final position
 * with no transition — the classic "it just appears" bug.
 */
export function useMountTransition(open: boolean, duration = 300) {
  const [mounted, setMounted] = React.useState(open)
  const [visible, setVisible] = React.useState(open)

  React.useEffect(() => {
    if (open) {
      setMounted(true)
      const show = () => setVisible(true)

      // Two frames: the first commits the mount, the second lets the browser
      // paint the closed state before we flip to open. One frame is unreliable
      // — React can batch the mount and the class change into the same paint.
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(show)
      })

      // Safety net only, for contexts where rAF never fires at all (background
      // tab, some power-saving modes) — otherwise the panel would mount and sit
      // parked off-screen forever, a far worse failure than a missed animation.
      //
      // It is deliberately well clear of a normal two-frame rAF (~32ms): a
      // mounting drawer commits a large tree, and in dev that render can take
      // longer than a short timeout. If the fallback wins that race it flips the
      // open class in the same paint as the mount, so the browser has no start
      // position to animate from and the slide-in stutters. rAF should always be
      // the one that fires; this only exists so a stuck drawer is impossible.
      const fallback = setTimeout(show, 150)

      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
        clearTimeout(fallback)
      }
    }

    setVisible(false)
    const timer = setTimeout(() => setMounted(false), duration)
    return () => clearTimeout(timer)
  }, [open, duration])

  return { mounted, visible }
}
