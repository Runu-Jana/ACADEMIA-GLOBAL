'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

// ssr:false is only legal inside a client component, hence this wrapper.
const HeroScene = dynamic(() => import('./hero-scene').then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
})

/**
 * Mounts the WebGL hero on the client. The three.js chunk is dynamically
 * imported so it stays out of the initial bundle and only loads after mount —
 * on phones and desktop alike. On mobile we pass `mobile` so the scene runs a
 * lighter build (fewer points, lower pixel ratio) to stay smooth on the
 * mid-range Android devices this platform targets. The scene itself still bows
 * out cleanly where WebGL is unavailable or reduced-motion is set.
 */
export function HeroSceneMount({ className }: { className?: string }) {
  const [ready, setReady] = React.useState(false)
  const [mobile, setMobile] = React.useState(false)

  React.useEffect(() => {
    setReady(true)
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!ready) return null
  return <HeroScene className={className} mobile={mobile} />
}
