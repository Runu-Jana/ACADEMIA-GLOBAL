'use client'

import * as React from 'react'
import * as THREE from 'three'

/**
 * WebGL backdrop for the hero — a slowly rotating point-globe with a wireframe
 * shell and orbiting nodes, tinted to the brand palette.
 *
 * Cost control, because this sits on the landing page:
 *  - loaded via dynamic import so three.js stays out of the initial bundle
 *  - the render loop is gated on visibility AND tab focus, so it burns no
 *    battery while scrolled past or backgrounded
 *  - `prefers-reduced-motion` renders a single static frame
 *  - every geometry/material/renderer is disposed on unmount (three.js does
 *    not garbage-collect GPU resources on its own)
 *  - falls back to `null` if WebGL is unavailable; the HTML cards layered on
 *    top remain the actual content either way
 */
export function HeroScene({ className }: { className?: string }) {
  const mountRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      })
    } catch {
      return // No WebGL — the layered HTML cards still tell the story.
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    // Framed so the globe plus its widest node orbit sit inside the viewport
    // at this fov, with margin to spare.
    camera.position.set(0, 0, 4.1)

    const globe = new THREE.Group()
    scene.add(globe)

    // ---- point sphere (Fibonacci distribution keeps spacing even) ----------
    const COUNT = 1500
    const positions = new Float32Array(COUNT * 3)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2
      const radius = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = i * golden
      positions[i * 3] = Math.cos(theta) * radius
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(theta) * radius
    }
    const pointGeo = new THREE.BufferGeometry()
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const pointMat = new THREE.PointsMaterial({
      color: 0x3b76f6,
      size: 0.019,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    globe.add(new THREE.Points(pointGeo, pointMat))

    // ---- wireframe shell ---------------------------------------------------
    const shellGeo = new THREE.IcosahedronGeometry(1.3, 1)
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
    })
    const shell = new THREE.Mesh(shellGeo, shellMat)
    globe.add(shell)

    // ---- orbiting nodes ----------------------------------------------------
    const NODES = 5
    const nodeGeo = new THREE.SphereGeometry(0.042, 14, 14)
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x6096fa })
    const nodes: THREE.Mesh[] = []
    for (let i = 0; i < NODES; i++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat)
      nodes.push(node)
      scene.add(node)
    }

    // ---- sizing ------------------------------------------------------------
    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    // ---- pointer parallax --------------------------------------------------
    let targetX = 0
    let targetY = 0
    const onPointerMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.6
      targetY = (e.clientY / window.innerHeight - 0.5) * 0.35
    }
    if (!reduced) window.addEventListener('pointermove', onPointerMove, { passive: true })

    // ---- only animate while actually on screen -----------------------------
    let onScreen = true
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
    })
    io.observe(mount)

    let raf = 0
    let t = 0

    const draw = () => {
      nodes.forEach((node, i) => {
        const angle = t * (0.42 + i * 0.09) + (i * Math.PI * 2) / NODES
        const radius = 1.46 + i * 0.05
        node.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 0.85) * 0.52,
          Math.sin(angle) * radius,
        )
      })
      renderer.render(scene, camera)
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!onScreen || document.hidden) return

      t += 0.005
      globe.rotation.y += 0.0018
      shell.rotation.y -= 0.0011
      shell.rotation.x = Math.sin(t * 0.5) * 0.14

      // Ease toward the pointer rather than snapping to it.
      globe.rotation.x += (targetY - globe.rotation.x) * 0.035
      camera.position.x += (targetX - camera.position.x) * 0.035
      camera.lookAt(0, 0, 0)

      draw()
    }

    // Always paint one frame up front. The loop below is gated on visibility
    // and tab focus, so without this the scene would stay blank whenever those
    // checks start out false rather than simply pausing an already-drawn frame.
    draw()
    if (!reduced) loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      ro.disconnect()
      io.disconnect()
      pointGeo.dispose()
      pointMat.dispose()
      shellGeo.dispose()
      shellMat.dispose()
      nodeGeo.dispose()
      nodeMat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden />
}

export default HeroScene
