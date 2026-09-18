'use client'

import * as React from 'react'
import { Play, Radio, MonitorPlay, Clock, FileText, Search, Copy, Check, ChevronDown, CheckCircle2, RotateCcw } from 'lucide-react'
import { parseVideoUrl } from '@/lib/video'
import {
  WATCH_COMPLETE_THRESHOLD,
  encodeSegments,
  decodeSegments,
  watchedPct as computeWatchedPct,
} from '@/lib/watch'
import { lessonTypeLabel } from './primitives'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ player */

export type MediaLesson = {
  id: string
  title: string
  type: string
  durationMin: number
  contentUrl: string | null
}

/** What a lesson video reports upward as it's watched. */
export type WatchProgress = {
  lessonId: string
  watchedPct: number
  positionSec: number
  segments: string
}

type VideoProps = {
  lesson: MediaLesson
  /** Resume point + already-watched seconds, restored from the server. */
  initialPositionSec?: number
  initialSegments?: string
  initialWatchedPct?: number
  /** The lesson is already marked complete — track for resume, don't re-fire. */
  alreadyComplete?: boolean
  /** Throttled save of partial watch state (roughly every 10s + on pause/leave). */
  onProgress?: (data: WatchProgress) => void
  /** Fires once when the watched fraction first crosses the completion threshold. */
  onReachComplete?: (lessonId: string) => void
  /** Title of the next lesson, for the "Up next" end card (null if this is last). */
  nextLabel?: string | null
  /** Advance to the next lesson (from the end card / auto-advance countdown). */
  onPlayNext?: () => void
  /** Start playing as soon as ready — set when this lesson was auto-advanced into. */
  autoPlay?: boolean
}

const THRESHOLD_PCT = Math.round(WATCH_COMPLETE_THRESHOLD * 100)

/**
 * Plays a lesson's video and tracks how much is genuinely watched.
 *
 * YouTube and Vimeo play through their JS player APIs (not a bare iframe) so we
 * can read the playback position; a direct media file plays in a native <video>.
 * All three feed one watched-segments tracker: only seconds actually *played*
 * count, so scrubbing to the end can't fake completion. Once the watched
 * fraction reaches the threshold, the lesson auto-completes. A LIVE lesson, or a
 * VIDEO with no usable URL, keeps the designed placeholder (nothing to track).
 */
export function LessonVideo(props: VideoProps) {
  const { lesson } = props
  const parsed = lesson.type === 'LIVE' ? ({ kind: 'unknown' } as const) : parseVideoUrl(lesson.contentUrl)

  const tracker = useWatchTracker(props)

  // Imperative handle each player populates once it's ready to seek/play, so the
  // resume prompt can drive it without silently jumping the video on load.
  const controls = React.useRef<PlayerControls | null>(null)
  const [ready, setReady] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)
  const [ended, setEnded] = React.useState(false)
  const onReady = React.useCallback(() => setReady(true), [])
  const onEnded = React.useCallback(() => setEnded(true), [])

  const resumeSec = props.alreadyComplete ? 0 : Math.floor(props.initialPositionSec ?? 0)
  // Only offer a resume when there's a meaningful way in (more than a few
  // seconds watched, and not already finished).
  const showResume = resumeSec >= 5 && !dismissed && !ended

  // Auto-advanced into this lesson → start playing once ready (and there's no
  // resume choice to make first).
  const autoPlayedRef = React.useRef(false)
  React.useEffect(() => {
    if (props.autoPlay && ready && !showResume && !autoPlayedRef.current) {
      autoPlayedRef.current = true
      controls.current?.play()
    }
  }, [props.autoPlay, ready, showResume])

  if (parsed.kind === 'youtube' || parsed.kind === 'vimeo' || parsed.kind === 'file') {
    return (
      <div>
        <div className="relative">
          {parsed.kind === 'youtube' && (
            <YouTubePlayer videoId={parsed.id} controls={controls} onReady={onReady} onEnded={onEnded} tracker={tracker} />
          )}
          {parsed.kind === 'vimeo' && (
            <VimeoPlayer videoId={parsed.id} controls={controls} onReady={onReady} onEnded={onEnded} tracker={tracker} />
          )}
          {parsed.kind === 'file' && (
            <FilePlayer src={parsed.fileUrl} title={lesson.title} controls={controls} onReady={onReady} onEnded={onEnded} tracker={tracker} />
          )}
          {showResume && (
            <ResumeOverlay
              seconds={resumeSec}
              ready={ready}
              onResume={() => {
                controls.current?.seek(resumeSec)
                controls.current?.play()
                setDismissed(true)
              }}
              onStartOver={() => {
                controls.current?.play()
                setDismissed(true)
              }}
            />
          )}
          {ended && (
            <EndCard
              nextLabel={props.nextLabel ?? null}
              onPlayNext={props.onPlayNext}
              onReplay={() => {
                setEnded(false)
                controls.current?.seek(0)
                controls.current?.play()
              }}
            />
          )}
        </div>
        <WatchBar pct={tracker.displayPct} complete={tracker.complete} marks={tracker.marks} />
      </div>
    )
  }

  return <VideoPlaceholder lesson={lesson} />
}

/**
 * Shown when a video finishes. If there's a next lesson it counts down and
 * auto-advances (Coursera-style), with the learner able to jump now, cancel, or
 * replay. On the last lesson it just offers a replay.
 */
function EndCard({
  nextLabel,
  onPlayNext,
  onReplay,
}: {
  nextLabel: string | null
  onPlayNext?: () => void
  onReplay: () => void
}) {
  const canAdvance = Boolean(nextLabel && onPlayNext)
  const [countdown, setCountdown] = React.useState<number | null>(canAdvance ? 5 : null)

  React.useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      onPlayNext?.()
      return
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [countdown, onPlayNext])

  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-3.5 text-center">
        {canAdvance ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Up next</p>
            <p className="line-clamp-2 text-balance text-sm font-bold text-white">{nextLabel}</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onPlayNext?.()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary-800 shadow-lift transition hover:bg-white/90"
              >
                <Play className="h-4 w-4 fill-current" />
                {countdown !== null ? `Play now (${countdown})` : 'Play next'}
              </button>
              <button
                type="button"
                onClick={onReplay}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </button>
            </div>
            {countdown !== null && (
              <button
                type="button"
                onClick={() => setCountdown(null)}
                className="text-[12px] font-semibold text-white/60 underline-offset-2 transition hover:text-white/90 hover:underline"
              >
                Cancel auto-play
              </button>
            )}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="text-sm font-bold text-white">You&rsquo;ve finished this lesson</p>
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Replay
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Imperative controls a player exposes once ready, for the resume prompt. */
type PlayerControls = {
  seek: (sec: number) => void
  play: () => void
}

/** "272" → "4:32"; "3725" → "1:02:05". */
function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/**
 * Offered on load when a learner has watched part of this video before. Rather
 * than silently jumping the playhead (disorienting), it asks: pick up where you
 * left off, or start over.
 */
function ResumeOverlay({
  seconds,
  ready,
  onResume,
  onStartOver,
}: {
  seconds: number
  ready: boolean
  onResume: () => void
  onStartOver: () => void
}) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/65 px-6 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <p className="text-[13px] font-medium text-white/80">You left off at {formatClock(seconds)}</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onResume}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary-800 shadow-lift transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4 fill-current" />
            Resume from {formatClock(seconds)}
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
            Start over
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- watch tracking */

/** A watched stretch of the timeline, positioned as percentages of duration. */
type WatchMark = { start: number; width: number }

type Tracker = {
  /** Credit the currently-playing second and recompute progress. */
  tick: (currentTime: number, duration: number) => void
  /** Note the position without crediting (pause, seek, metadata load). */
  setPosition: (currentTime: number, duration?: number) => void
  /** Persist now; `force` bypasses the throttle (pause/leave/complete). */
  flush: (force?: boolean) => void
  displayPct: number
  complete: boolean
  /** Watched stretches, for the watched-vs-unwatched timeline. */
  marks: WatchMark[]
}

/** Merge watched integer-seconds into positioned timeline stretches. */
function computeMarks(watched: Set<number>, durationSec: number): WatchMark[] {
  if (!durationSec || durationSec <= 0 || watched.size === 0) return []
  const dur = Math.floor(durationSec)
  const secs = [...watched].filter((n) => n >= 0 && n <= dur).sort((a, b) => a - b)
  const marks: WatchMark[] = []
  let start = secs[0]
  let prev = secs[0]
  const push = (a: number, b: number) => {
    marks.push({ start: (a / dur) * 100, width: ((b - a + 1) / dur) * 100 })
  }
  for (let i = 1; i < secs.length; i++) {
    if (secs[i] === prev + 1) {
      prev = secs[i]
      continue
    }
    push(start, prev)
    start = prev = secs[i]
  }
  push(start, prev)
  return marks
}

/**
 * The shared, provider-agnostic watch tracker. Owns the set of watched
 * integer-seconds (rehydrated from the server so progress accumulates across
 * sessions), the resume position, throttled saving, and the one-shot completion
 * trigger. Player components just call `tick` while playing.
 */
function useWatchTracker(props: VideoProps): Tracker {
  const { lesson, onProgress, onReachComplete } = props

  // Keep the callbacks in refs so the returned tracker stays referentially
  // stable — player effects subscribe to it once and never resubscribe.
  const onProgressRef = React.useRef(onProgress)
  const onReachCompleteRef = React.useRef(onReachComplete)
  React.useEffect(() => {
    onProgressRef.current = onProgress
    onReachCompleteRef.current = onReachComplete
  })

  const watchedRef = React.useRef<Set<number>>(decodeSegments(props.initialSegments))
  const durationRef = React.useRef(0)
  const positionRef = React.useRef(props.initialPositionSec ?? 0)
  const completedRef = React.useRef(Boolean(props.alreadyComplete))
  const lastSaveRef = React.useRef(0)

  const [displayPct, setDisplayPct] = React.useState(() =>
    props.alreadyComplete ? 100 : Math.min(100, props.initialWatchedPct ?? 0),
  )
  const [complete, setComplete] = React.useState(Boolean(props.alreadyComplete))
  const [marks, setMarks] = React.useState<WatchMark[]>([])

  const flush = React.useCallback((force = false) => {
    const now = Date.now()
    if (!force && now - lastSaveRef.current < 9000) return
    lastSaveRef.current = now
    onProgressRef.current?.({
      lessonId: lesson.id,
      watchedPct: computeWatchedPct(watchedRef.current.size, durationRef.current),
      positionSec: Math.floor(positionRef.current),
      segments: encodeSegments(watchedRef.current),
    })
  }, [lesson.id])

  const tick = React.useCallback(
    (currentTime: number, duration: number) => {
      if (duration > 0) durationRef.current = duration
      positionRef.current = currentTime
      const sec = Math.floor(currentTime)
      if (sec >= 0) watchedRef.current.add(sec)

      const pct = computeWatchedPct(watchedRef.current.size, durationRef.current)
      setDisplayPct((prev) => (pct > prev ? pct : prev))
      setMarks(computeMarks(watchedRef.current, durationRef.current))

      if (!completedRef.current && durationRef.current > 0 && pct >= THRESHOLD_PCT) {
        completedRef.current = true
        setComplete(true)
        flush(true)
        onReachCompleteRef.current?.(lesson.id)
      } else {
        flush(false)
      }
    },
    [flush, lesson.id],
  )

  const setPosition = React.useCallback((currentTime: number, duration?: number) => {
    if (duration && duration > 0) durationRef.current = duration
    positionRef.current = currentTime
  }, [])

  // Save on tab-hide and unmount so a learner who closes the tab mid-lesson
  // still resumes where they left off.
  React.useEffect(() => {
    const onHide = () => flush(true)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      flush(true)
    }
  }, [flush])

  return { tick, setPosition, flush, displayPct, complete, marks }
}

/**
 * A slim timeline showing which parts of the video have been watched. Once the
 * duration is known it renders the actual watched stretches (so gaps a learner
 * skipped are visible); before then it falls back to a cumulative fill of the
 * restored percentage.
 */
function WatchBar({ pct, complete, marks }: { pct: number; complete: boolean; marks: WatchMark[] }) {
  const fill = complete
    ? 'bg-emerald-500'
    : 'bg-gradient-to-r from-primary-500 to-holo-violet'
  return (
    <div className="flex items-center gap-2.5 border-t border-border bg-muted/30 px-3.5 py-2">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        {marks.length > 0 ? (
          marks.map((m, i) => (
            <div
              key={i}
              className={cn('absolute inset-y-0 rounded-full', fill)}
              style={{ left: `${m.start}%`, width: `${Math.max(0.5, m.width)}%` }}
            />
          ))
        ) : (
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', fill)}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        )}
      </div>
      {complete ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Completed
        </span>
      ) : (
        <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-muted-foreground">
          Watched {Math.min(100, pct)}% · completes at {THRESHOLD_PCT}%
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ file player */

function FilePlayer({
  src,
  title,
  controls,
  onReady,
  onEnded,
  tracker,
}: {
  src: string
  title: string
  controls: React.RefObject<PlayerControls | null>
  onReady: () => void
  onEnded: () => void
  tracker: Tracker
}) {
  const ref = React.useRef<HTMLVideoElement>(null)
  const playingRef = React.useRef(false)

  React.useEffect(() => {
    const v = ref.current
    if (!v) return

    const onLoaded = () => onReady()
    const onPlay = () => {
      playingRef.current = true
    }
    const onPause = () => {
      playingRef.current = false
      tracker.setPosition(v.currentTime, v.duration || 0)
      tracker.flush(true)
    }
    const onEndedEvt = () => {
      onPause()
      onEnded()
    }
    const onTime = () => {
      if (playingRef.current) tracker.tick(v.currentTime, v.duration || 0)
      else tracker.setPosition(v.currentTime, v.duration || 0)
    }

    controls.current = {
      seek: (sec) => {
        try {
          v.currentTime = sec
        } catch {
          /* not seekable yet — ignore */
        }
      },
      play: () => {
        v.play().catch(() => {})
      },
    }

    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('play', onPlay)
    v.addEventListener('playing', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onEndedEvt)
    v.addEventListener('timeupdate', onTime)
    // Metadata may already be loaded by the time this effect runs.
    if (v.readyState >= 1) onReady()
    return () => {
      controls.current = null
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('playing', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onEndedEvt)
      v.removeEventListener('timeupdate', onTime)
    }
  }, [tracker, controls, onReady, onEnded])

  return (
    <div className="aspect-video w-full bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captions live in the transcript panel */}
      <video
        ref={ref}
        src={src}
        title={title}
        controls
        preload="metadata"
        playsInline
        className="h-full w-full bg-black object-contain"
      >
        Your browser can’t play this video.
      </video>
    </div>
  )
}

/* --------------------------------------------------------- youtube player */

/* eslint-disable @typescript-eslint/no-explicit-any */
let ytApiPromise: Promise<any> | null = null
function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const w = window as any
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(w.YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

function YouTubePlayer({
  videoId,
  controls,
  onReady,
  onEnded,
  tracker,
}: {
  videoId: string
  controls: React.RefObject<PlayerControls | null>
  onReady: () => void
  onEnded: () => void
  tracker: Tracker
}) {
  const hostRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let player: any = null
    let poll: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return
      player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            controls.current = {
              seek: (sec) => player.seekTo(sec, true),
              play: () => player.playVideo(),
            }
            onReady()
          },
          onStateChange: (e: any) => {
            // Save immediately when the learner pauses or the video ends.
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
              try {
                tracker.setPosition(player.getCurrentTime(), player.getDuration())
              } catch {
                /* ignore */
              }
              tracker.flush(true)
            }
            if (e.data === YT.PlayerState.ENDED) onEnded()
          },
        },
      })

      // Credit one second at a time while the video is actually playing.
      poll = setInterval(() => {
        if (!player || typeof player.getPlayerState !== 'function') return
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
          tracker.tick(player.getCurrentTime(), player.getDuration())
        }
      }, 1000)
    })

    return () => {
      cancelled = true
      controls.current = null
      if (poll) clearInterval(poll)
      try {
        player?.destroy?.()
      } catch {
        /* ignore */
      }
    }
  }, [videoId, controls, onReady, onEnded, tracker])

  return (
    <div className="aspect-video w-full bg-black">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  )
}

/* ----------------------------------------------------------- vimeo player */

let vimeoApiPromise: Promise<any> | null = null
function loadVimeoApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const w = window as any
  if (w.Vimeo?.Player) return Promise.resolve(w.Vimeo)
  if (vimeoApiPromise) return vimeoApiPromise
  vimeoApiPromise = new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://player.vimeo.com/api/player.js'
    tag.onload = () => resolve(w.Vimeo)
    tag.onerror = () => reject(new Error('vimeo api failed to load'))
    document.head.appendChild(tag)
  })
  return vimeoApiPromise
}

function VimeoPlayer({
  videoId,
  controls,
  onReady,
  onEnded,
  tracker,
}: {
  videoId: string
  controls: React.RefObject<PlayerControls | null>
  onReady: () => void
  onEnded: () => void
  tracker: Tracker
}) {
  const hostRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let player: any = null
    let cancelled = false
    let playing = false

    loadVimeoApi().then((Vimeo) => {
      if (cancelled || !hostRef.current) return
      player = new Vimeo.Player(hostRef.current, {
        id: Number(videoId),
        responsive: true,
      })

      player.ready().then(() => {
        if (cancelled) return
        controls.current = {
          seek: (sec) => player.setCurrentTime(sec).catch(() => {}),
          play: () => player.play().catch(() => {}),
        }
        onReady()
      })

      player.on('play', () => {
        playing = true
      })
      player.on('timeupdate', (d: { seconds: number; duration: number }) => {
        if (playing) tracker.tick(d.seconds, d.duration)
        else tracker.setPosition(d.seconds, d.duration)
      })
      player.on('pause', (d: { seconds: number; duration: number }) => {
        playing = false
        tracker.setPosition(d.seconds, d.duration)
        tracker.flush(true)
      })
      player.on('ended', (d: { seconds: number; duration: number }) => {
        playing = false
        tracker.setPosition(d.seconds, d.duration)
        tracker.flush(true)
        onEnded()
      })
    })

    return () => {
      cancelled = true
      controls.current = null
      try {
        player?.destroy?.()
      } catch {
        /* ignore */
      }
    }
  }, [videoId, controls, onReady, onEnded, tracker])

  return (
    <div className="aspect-video w-full overflow-hidden bg-black [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full">
      <div ref={hostRef} className="relative h-full w-full" />
    </div>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The designed stand-in — LIVE sessions, or a video with no attached URL yet. */
function VideoPlaceholder({ lesson }: { lesson: MediaLesson }) {
  const live = lesson.type === 'LIVE'
  const Icon = live ? Radio : MonitorPlay

  return (
    <div
      className={cn(
        'relative grid aspect-video w-full place-items-center overflow-hidden bg-gradient-to-br',
        live
          ? 'from-cyan-600 via-primary-700 to-holo-indigo'
          : 'from-primary-900 via-primary-700 to-holo-violet',
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 [background-image:repeating-radial-gradient(circle_at_15%_120%,rgba(255,255,255,.45)_0,rgba(255,255,255,.45)_1px,transparent_1px,transparent_26px)]"
      />
      <div aria-hidden className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

      <div className="relative flex flex-col items-center px-6 text-center">
        <span
          aria-hidden
          className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-primary-700 shadow-lift"
        >
          <Play className="ml-1 h-7 w-7 fill-current" />
        </span>
        <p className="mt-4 text-sm font-bold text-white drop-shadow-sm">
          {live ? 'Live classroom session' : 'Lesson video'}
        </p>
        <p className="mt-1 text-[11.5px] text-white/75">
          {live
            ? 'The classroom link and recording appear here at class time.'
            : 'A video hasn’t been attached to this lesson yet.'}
        </p>
      </div>

      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        <Icon className="h-3 w-3" />
        {lessonTypeLabel(lesson.type)}
      </span>
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        <Clock className="h-3 w-3" />
        {lesson.durationMin} min
      </span>
    </div>
  )
}

/* -------------------------------------------------------------- transcript */

const WORDS = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0)

/**
 * The read-along transcript. Collapsed by default so it never crowds the video,
 * but always present — it's the text alternative that makes a video lesson
 * accessible, and it's searchable so a learner can jump to the moment a term
 * was explained.
 */
export function LessonTranscript({ transcript }: { transcript: string }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  const paragraphs = React.useMemo(
    () => transcript.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [transcript],
  )

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return paragraphs.reduce((n, p) => n + p.toLowerCase().split(q).length - 1, 0)
  }, [paragraphs, query])

  async function copy() {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 bg-muted/40 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/70"
      >
        <FileText className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" aria-hidden />
        <span className="text-[13px] font-bold">Transcript</span>
        <span className="text-[11.5px] text-muted-foreground">
          {WORDS(transcript).toLocaleString('en-IN')} words
        </span>
        <ChevronDown
          aria-hidden
          className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-border p-3.5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the transcript…"
                aria-label="Search the transcript"
                className="h-9 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/12"
              />
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {query.trim() && (
            <p className="mb-2 text-[11.5px] text-muted-foreground">
              {matches} match{matches === 1 ? '' : 'es'} for “{query.trim()}”
            </p>
          )}

          <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1 text-[13.5px] leading-relaxed text-foreground/90">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-pretty">
                {highlight(p, query)}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/** Wraps case-insensitive matches of `query` in a highlighted <mark>. */
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim()
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-amber-200 px-0.5 text-inherit dark:bg-amber-400/40">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}
