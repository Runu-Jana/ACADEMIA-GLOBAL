'use client'

import * as React from 'react'
import { Play, Radio, MonitorPlay, Clock, FileText, Search, Copy, Check, ChevronDown } from 'lucide-react'
import { parseVideoUrl } from '@/lib/video'
import { lessonTypeLabel } from './primitives'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ player */

export type MediaLesson = {
  title: string
  type: string
  durationMin: number
  contentUrl: string | null
}

/**
 * Plays a lesson's video, or shows a graceful stand-in when there's nothing to
 * play. YouTube and Vimeo become their canonical embeds; a direct media file
 * plays in a native <video> (whose own controls give speed, fullscreen and
 * scrubbing). A LIVE lesson, or a VIDEO with no usable URL, keeps the designed
 * placeholder rather than a broken frame.
 */
export function LessonVideo({ lesson }: { lesson: MediaLesson }) {
  const parsed = lesson.type === 'LIVE' ? ({ kind: 'unknown' } as const) : parseVideoUrl(lesson.contentUrl)

  if (parsed.kind === 'youtube' || parsed.kind === 'vimeo') {
    return (
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={parsed.embedUrl}
          title={lesson.title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  if (parsed.kind === 'file') {
    return (
      <div className="aspect-video w-full bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captions live in the transcript panel */}
        <video
          src={parsed.fileUrl}
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

  return <VideoPlaceholder lesson={lesson} />
}

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
