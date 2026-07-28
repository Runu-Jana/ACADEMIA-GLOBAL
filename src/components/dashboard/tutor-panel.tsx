'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles, Send, X, Trash2, AlertCircle, Bot, GraduationCap, BookText, Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, initials } from '@/lib/utils'

type Source = { n: number; label: string; type: string }

type Turn = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  weak?: boolean
  streaming?: boolean
}

const BASE_SUGGESTIONS = [
  'Give me a quick summary of this course.',
  'What will I be able to do after finishing it?',
  'Which module should I start with?',
  'How is this course assessed?',
]

export function TutorPanel({
  courseId,
  courseTitle,
  userName,
  lessonHint,
}: {
  courseId: string
  courseTitle: string
  userName: string
  lessonHint?: string | null
}) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-xl bg-holo-sweep px-3.5 py-2 text-[12.5px] font-bold text-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4" />
        Ask AI Tutor
      </button>

      {mounted &&
        createPortal(
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            courseId={courseId}
            courseTitle={courseTitle}
            userName={userName}
            lessonHint={lessonHint}
          />,
          document.body,
        )}
    </>
  )
}

function Drawer({
  open,
  onClose,
  courseId,
  courseTitle,
  userName,
  lessonHint,
}: {
  open: boolean
  onClose: () => void
  courseId: string
  courseTitle: string
  userName: string
  lessonHint?: string | null
}) {
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [input, setInput] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [configured, setConfigured] = React.useState(true)
  const [loaded, setLoaded] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Load the saved thread the first time the drawer is opened.
  React.useEffect(() => {
    if (!open || loaded) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/tutor?courseId=${encodeURIComponent(courseId)}`)
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (typeof data.configured === 'boolean') setConfigured(data.configured)
        const msgs: Turn[] = Array.isArray(data.messages)
          ? data.messages.map((m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            }))
          : []
        setTurns(msgs)
      } catch {
        /* an empty thread is a fine starting point */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, loaded, courseId])

  // Escape closes; lock body scroll while open.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => inputRef.current?.focus(), 120)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      clearTimeout(t)
    }
  }, [open, onClose])

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, busy])

  async function send(message: string) {
    const text = message.trim()
    if (!text || busy || !configured) return

    setError('')
    setInput('')
    const userTurn: Turn = { id: `u-${Date.now()}`, role: 'user', content: text }
    const assistantId = `a-${Date.now()}`
    setTurns((t) => [...t, userTurn, { id: assistantId, role: 'assistant', content: '', streaming: true }])
    setBusy(true)

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, message: text, lessonHint: lessonHint ?? undefined }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 503) setConfigured(false)
        setError(typeof data.error === 'string' ? data.error : 'The tutor could not answer just now.')
        // Drop the empty assistant bubble we optimistically added.
        setTurns((t) => t.filter((turn) => turn.id !== assistantId))
        return
      }

      let sources: Source[] = []
      try {
        sources = JSON.parse(decodeURIComponent(res.headers.get('X-Tutor-Sources') ?? '[]'))
      } catch {
        sources = []
      }
      const weak = res.headers.get('X-Tutor-Weak') === '1'

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setTurns((t) =>
          t.map((turn) => (turn.id === assistantId ? { ...turn, content: acc } : turn)),
        )
      }

      setTurns((t) =>
        t.map((turn) =>
          turn.id === assistantId
            ? { ...turn, content: acc.trim(), sources, weak, streaming: false }
            : turn,
        ),
      )
    } catch {
      setError('Network error — check your connection and try again.')
      setTurns((t) => t.filter((turn) => turn.id !== assistantId))
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  async function clearThread() {
    if (!turns.length) return
    if (!window.confirm('Clear this tutor conversation? It will be deleted.')) return
    try {
      await fetch(`/api/tutor?courseId=${encodeURIComponent(courseId)}`, { method: 'DELETE' })
    } catch {
      /* clearing the local view is still worthwhile */
    }
    setTurns([])
    setError('')
  }

  const suggestions = React.useMemo(() => {
    const list = [...BASE_SUGGESTIONS]
    if (lessonHint) list.unshift(`Explain "${lessonHint}" simply.`)
    return list.slice(0, 4)
  }, [lessonHint])

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] transition-opacity duration-300',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close tutor"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`AI tutor for ${courseTitle}`}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-spring',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ------------------------------------------------------- header */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-holo-sweep">
            <GraduationCap className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-[15px] font-bold leading-tight">
              AI Tutor
              <Badge tone="holo" className="shrink-0">
                Course-aware
              </Badge>
            </h2>
            <p className="truncate text-[12px] text-muted-foreground">{courseTitle}</p>
          </div>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={clearThread}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600"
              aria-label="Clear conversation"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ------------------------------------------------------ messages */}
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4"
        >
          {turns.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 text-[13px] leading-relaxed text-muted-foreground shadow-soft">
              <p className="font-semibold text-foreground">Hi{userName ? `, ${userName.split(' ')[0]}` : ''} 👋</p>
              <p className="mt-1.5">
                I&rsquo;m your tutor for <span className="font-semibold text-foreground">{courseTitle}</span>.
                Ask me about the syllabus, a lesson, or how the course is assessed — I answer from{' '}
                <span className="font-semibold text-foreground">this course&rsquo;s materials</span>, and
                I&rsquo;ll tell you when something isn&rsquo;t covered.
              </p>
            </div>
          )}

          {turns.map((turn) => (
            <TurnRow key={turn.id} turn={turn} userName={userName} />
          ))}

          {busy && turns[turns.length - 1]?.content === '' && (
            <div className="flex items-end gap-2.5">
              <TutorAvatar />
              <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-soft">
                <span className="sr-only">Thinking…</span>
                <span className="flex items-center gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400"
                      style={{ animationDelay: `${i * 180}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ composer */}
        <div className="border-t border-border p-3 sm:p-4">
          {!configured && (
            <p className="mb-2.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[12px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The AI tutor isn&rsquo;t configured on this environment yet. An administrator needs to add an
              API key to switch it on.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mb-2.5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {configured && turns.length === 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-left text-[12px] font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:text-primary-600 disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3 shrink-0 text-primary-500" aria-hidden />
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={configured ? 'Ask anything about this course…' : 'Tutor unavailable'}
              aria-label="Ask the AI tutor"
              maxLength={1000}
              disabled={!configured || busy}
              className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-surface px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 disabled:opacity-60"
            />
            <Button
              type="submit"
              variant="holo"
              size="icon"
              className="h-12 w-12 shrink-0"
              disabled={busy || !input.trim() || !configured}
              aria-label="Send"
            >
              <Send className="h-4.5 w-4.5" />
            </Button>
          </form>

          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Answers are grounded in this course&rsquo;s materials. The tutor can be wrong — double-check
            anything important against your syllabus.
          </p>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------- turn */

function TurnRow({ turn, userName }: { turn: Turn; userName: string }) {
  const isUser = turn.role === 'user'
  return (
    <div className={cn('flex items-end gap-2.5', isUser && 'flex-row-reverse')}>
      {isUser ? <UserAvatar userName={userName} /> : <TutorAvatar />}
      <div className={cn('min-w-0 max-w-[85%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-soft',
            isUser
              ? 'rounded-br-md bg-primary-600 text-white'
              : 'rounded-bl-md border border-border bg-card',
          )}
        >
          {turn.content}
          {turn.streaming && !turn.content && <span className="sr-only">Generating answer</span>}
        </div>

        {!isUser && turn.sources && turn.sources.length > 0 && !turn.weak && (
          <div className="flex flex-wrap gap-1.5">
            {turn.sources.map((s) => (
              <span
                key={s.n}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[10.5px] font-semibold text-muted-foreground"
                title={s.label}
              >
                <BookText className="h-3 w-3 shrink-0 text-primary-500" aria-hidden />
                <span className="max-w-[12rem] truncate">
                  [{s.n}] {s.label}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TutorAvatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-holo-sweep" aria-hidden>
      <Bot className="h-4 w-4 text-white" />
    </span>
  )
}

function UserAvatar({ userName }: { userName: string }) {
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-fade text-[10px] font-bold text-white"
      aria-hidden
    >
      {userName ? initials(userName) : 'You'.slice(0, 2)}
    </span>
  )
}
