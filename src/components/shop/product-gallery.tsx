'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, ZoomIn, X, Minus, Plus } from 'lucide-react'
import { ProductCover } from './product-cover'
import { cn } from '@/lib/utils'

/**
 * Product image carousel with a zoom lightbox.
 *
 * Built on scroll-snap rather than a carousel library: the browser already does
 * momentum, rubber-banding and native swipe better than JS re-implements them,
 * and it keeps the page working before hydration. Arrows and thumbnails just
 * scroll the same strip.
 *
 * Degrades honestly. Most products carry no photography, only the generated
 * category artwork — there is nothing to zoom into on a gradient, so with no
 * real images the component renders the plain cover with no carousel chrome and
 * no zoom affordance, rather than inviting a click that does nothing.
 */

const ZOOM_STEPS = [1, 2, 3] as const

export function ProductGallery({
  kind,
  category,
  title,
  author,
  imageUrl,
  images,
}: {
  kind: string
  category: string
  title: string
  author: string | null
  imageUrl: string | null
  images: string[]
}) {
  // Real photography only — the generated cover is a fallback, not a slide.
  const slides = React.useMemo(
    () => [imageUrl, ...images].filter((src): src is string => Boolean(src)),
    [imageUrl, images],
  )

  const [index, setIndex] = React.useState(0)
  const [lightbox, setLightbox] = React.useState(false)
  const stripRef = React.useRef<HTMLDivElement>(null)

  const scrollTo = React.useCallback((i: number) => {
    const strip = stripRef.current
    if (!strip) return
    strip.scrollTo({ left: strip.clientWidth * i, behavior: 'smooth' })
  }, [])

  // The strip is the source of truth for which slide is showing — a swipe must
  // update the dots and thumbnails just like an arrow press does.
  const onScroll = React.useCallback(() => {
    const strip = stripRef.current
    if (!strip || strip.clientWidth === 0) return
    setIndex(Math.round(strip.scrollLeft / strip.clientWidth))
  }, [])

  // ---- no photography: plain cover, no carousel, no zoom ----
  if (slides.length === 0) {
    return (
      <div className="card-base mx-auto max-w-[14rem] overflow-hidden lg:mx-0 lg:max-w-none">
        <ProductCover
          kind={kind}
          category={category}
          title={title}
          author={author}
          imageUrl={null}
          className="aspect-[3/4] w-full"
        />
      </div>
    )
  }

  const many = slides.length > 1

  return (
    <>
      <div className="mx-auto max-w-[14rem] lg:mx-0 lg:max-w-none">
        <div className="group card-base relative overflow-hidden">
          <div
            ref={stripRef}
            onScroll={onScroll}
            // no-scrollbar keeps the native swipe without the OS gutter showing
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
            aria-label={`${title} images`}
          >
            {slides.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setLightbox(true)}
                aria-label={`Zoom image ${i + 1} of ${slides.length}`}
                className="relative w-full shrink-0 snap-center cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={i === 0 ? title : `${title} — view ${i + 1}`}
                  className="aspect-[3/4] w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              </button>
            ))}
          </div>

          {/* Zoom hint. Pointer-events off so it never eats the click. */}
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-lg bg-slate-900/55 text-white backdrop-blur-sm">
            <ZoomIn aria-hidden className="h-4 w-4" />
          </span>

          {many && (
            <>
              <button
                type="button"
                onClick={() => scrollTo(Math.max(0, index - 1))}
                disabled={index === 0}
                aria-label="Previous image"
                className={cn(
                  'absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-card backdrop-blur transition-opacity',
                  'hover:bg-white disabled:pointer-events-none disabled:opacity-0',
                  // Always available on touch; fades in on hover for pointers.
                  'lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100',
                )}
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollTo(Math.min(slides.length - 1, index + 1))}
                disabled={index === slides.length - 1}
                aria-label="Next image"
                className={cn(
                  'absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-card backdrop-blur transition-opacity',
                  'hover:bg-white disabled:pointer-events-none disabled:opacity-0',
                  'lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100',
                )}
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>

              <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
                {slides.map((src, i) => (
                  <span
                    key={src}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60',
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {many && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {slides.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                  i === index ? 'border-primary-500' : 'border-transparent hover:border-border',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-14 w-14 object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox
          slides={slides}
          startIndex={index}
          title={title}
          onClose={(finalIndex) => {
            setLightbox(false)
            // Keep the page carousel on whatever the lightbox ended on.
            scrollTo(finalIndex)
            setIndex(finalIndex)
          }}
        />
      )}
    </>
  )
}

/* ---------------------------------------------------------------- lightbox */

function Lightbox({
  slides,
  startIndex,
  title,
  onClose,
}: {
  slides: string[]
  startIndex: number
  title: string
  onClose: (index: number) => void
}) {
  const [index, setIndex] = React.useState(startIndex)
  const [zoom, setZoom] = React.useState(0) // index into ZOOM_STEPS
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  const scale = ZOOM_STEPS[zoom]
  const zoomed = scale > 1

  const go = React.useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(slides.length - 1, next)))
      // A new image starts unzoomed and centred, or the pan offset from the
      // previous one would apply to a different picture.
      setZoom(0)
      setOffset({ x: 0, y: 0 })
    },
    [slides.length],
  )

  // Lock the page behind the overlay and wire the keyboard.
  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      else if (e.key === 'ArrowLeft') go(indexRef.current - 1)
      else if (e.key === 'ArrowRight') go(indexRef.current + 1)
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))
      else if (e.key === '-') setZoom((z) => Math.max(0, z - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [go])

  // Refs so the keydown listener doesn't need re-binding on every state change.
  const indexRef = React.useRef(index)
  indexRef.current = index
  const onCloseRef = React.useRef(() => onClose(index))
  onCloseRef.current = () => onClose(index)

  function startDrag(x: number, y: number) {
    if (!zoomed) return
    drag.current = { x, y, ox: offset.x, oy: offset.y }
  }

  function moveDrag(x: number, y: number) {
    const d = drag.current
    if (!d) return
    setOffset({ x: d.ox + (x - d.x), y: d.oy + (y - d.y) })
  }

  const endDrag = () => {
    drag.current = null
  }

  const ctrl =
    'grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — image ${index + 1} of ${slides.length}`}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-sm"
    >
      {/* ---------------------------------------------------------- top bar */}
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur">
          {index + 1} / {slides.length}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0, z - 1))}
            disabled={zoom === 0}
            aria-label="Zoom out"
            className={ctrl}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-11 text-center text-[12px] font-bold text-white tabular-nums">
            {scale}×
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
            disabled={zoom === ZOOM_STEPS.length - 1}
            aria-label="Zoom in"
            className={ctrl}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onClose(index)}
            aria-label="Close"
            className={ctrl}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------- stage */}
      <div
        className={cn(
          'relative flex flex-1 items-center justify-center overflow-hidden p-3',
          zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
        )}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={endDrag}
        // Tapping the stage toggles between fit and 2× — the fastest way to
        // inspect a page of small print on a phone.
        onClick={() => !drag.current && setZoom((z) => (z === 0 ? 1 : 0))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slides[index]}
          alt={index === 0 ? title : `${title} — view ${index + 1}`}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        />
      </div>

      {/* ------------------------------------------------------ thumbnails */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous image"
            className={ctrl}
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>

          <div className="no-scrollbar flex max-w-[60vw] gap-2 overflow-x-auto">
            {slides.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                  i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-12 w-12 object-cover" loading="lazy" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === slides.length - 1}
            aria-label="Next image"
            className={ctrl}
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
