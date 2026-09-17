'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

// ssr:false is only legal inside a client component, hence this wrapper.
const HeroScene = dynamic(() => import('./hero-scene').then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
})

/**
 * Gates the WebGL hero behind the desktop breakpoint. The whole hero graphic is
 * hidden below lg (see hero.tsx), so there's no reason to mount the scene — or
 * download the three.js chunk — on phones/tablets. Because the dynamic import
 * only fires when this actually renders, mobile never pays for three.js at all.
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
