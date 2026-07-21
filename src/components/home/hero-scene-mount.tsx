'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

// ssr:false is only legal inside a client component, hence this wrapper.
const HeroScene = dynamic(() => import('./hero-scene').then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
})

/**
 * Gates the WebGL hero behind a desktop media query. Because the import only
 * fires when the component actually renders, phones never download the
 * three.js chunk at all — which matters a lot more than it sounds on the
 * mid-range Android + patchy-network audience this platform targets.
 */
export function HeroSceneMount({ className }: { className?: string }) {
  const [enabled, setEnabled] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!enabled) return null
  return <HeroScene className={className} />
}
