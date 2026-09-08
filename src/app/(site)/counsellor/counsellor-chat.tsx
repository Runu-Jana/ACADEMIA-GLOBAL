'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Bot,
  Send,
  Sparkles,
  GitCompare,
  ArrowRight,
  Info,
  Trash2,
  AlertCircle,
  Headset,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Stars } from '@/components/ui/stars'
import { UniversityMark } from '@/components/course/course-thumb'
import { useCompare } from '@/lib/use-compare'
import { cn, formatINR, initials } from '@/lib/utils'
import { COURSE_MODES } from '@/lib/constants'

export type CourseRec = {
  id: string
  slug: string
  title: string
  level: string
  mode: string
  durationYears: number
  feePerYear: number
  rating: number
  reviews: number
  university: { name: string; shortName: string; slug: string }
}

export type ChatTurn = {
  id: string
  role: 'user' | 'assistant'
  content: string
  courses?: CourseRec[]
}

const SUGGESTIONS = [
  'I want to pursue a BBA. Which course is best for me?',
  'Which courses suit working professionals?',
  'Show me the most affordable degrees',
  'What can I do after 12th?',
]

const WELCOME: ChatTurn = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm Sarthi, your Shiksha Sarthi study guide. I match what you tell me against our real course catalogue — subject, level, study mode and budget — and suggest programmes that fit. Ask me anything below, or start with one of these.",
}

export function CounsellorChat({
  initialMessages,
  signedIn,
  userName,
}: {
  initialMessages: ChatTurn[]
  signedIn: boolean
  userName: string
}) {
  const [turns, setTurns] = React.useState<ChatTurn[]>(
    initialMessages.length ? initialMessages : [WELCOME],
  )
  const [input, setInput] = React.useState('')
  const [thinking, setThinking] = React.useState(false)
  const [error, setError] = React.useState('')

  // Anonymous visitors introduce themselves first, so a handoff has someone to
  // call back. Signed-in visitors already have an account, so they skip straight
  // to chatting and a lead is created lazily only if they ask for a counsellor.
  const [collecting, setCollecting] = React.useState(!signedIn)
  const [leadId, setLeadId] = React.useState<string | null>(null)
  const [handoff, setHandoff] = React.useState<'idle' | 'sending' | 'done'>('idle')

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Keep the newest turn in view without scrolling the whole page.
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, thinking])

  function appendAssistant(content: string, courses: CourseRec[] = []) {
    setTurns((t) => [...t, { id: `a-${Date.now()}`, role: 'assistant', content, courses }])
  }

  async function send(message: string) {
    const text = message.trim()
    if (!text || thinking) return

    setError('')
    setInput('')
    setTurns((t) => [...t, { id: `u-${Date.now()}`, role: 'user', content: text }])
    setThinking(true)

    try {
      const res = await fetch('/api/counsellor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, leadId: leadId ?? undefined }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
        return
      }

      appendAssistant(data.reply as string, (data.courses as CourseRec[]) ?? [])
      // The visitor asked for a human in the message itself — reflect the handoff.
      if (data.handoff) setHandoff('done')
      else if (data.needContact) setCollecting(true)
    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setThinking(false)
      inputRef.current?.focus()
    }
  }

  async function requestAgent() {
    if (handoff !== 'idle') return
    setHandoff('sending')
    setError('')
    try {
      const res = await fetch('/api/counsellor/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: leadId ?? undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Anonymous with no lead yet — send them back to the intro form.
        if (res.status === 400) setCollecting(true)
        setError(typeof data.error === 'string' ? data.error : 'Could not reach a counsellor. Please try again.')
        setHandoff('idle')
        return
      }
      appendAssistant(data.reply as string)
      setHandoff('done')
    } catch {
      setError('Network error — please try again.')
      setHandoff('idle')
    }
  }

  async function clearThread() {
    if (!window.confirm('Clear this conversation? Your saved thread will be deleted.')) return
    try {
      await fetch('/api/counsellor', { method: 'DELETE' })
    } catch {
      /* clearing the local view is still worth doing */
    }
    setTurns([WELCOME])
    setError('')
  }

  return (
    <div className="card-base holo-ring flex flex-col overflow-hidden">
      {/* ------------------------------------------------------------ header */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-holo-sweep">
          <Bot className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15px] font-bold leading-tight">
            Sarthi
            <Badge tone="cyan" className="shrink-0">
              Guided recommender
            </Badge>
          </h2>
          <p className="truncate text-[12px] text-muted-foreground">
            Matches your answers against our live course catalogue
          </p>
        </div>

        {signedIn && turns.length > 1 && (
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
      </div>

      {collecting ? (
        <IntroForm
          onError={setError}
          onDone={(id, firstName) => {
            setLeadId(id)
            setCollecting(false)
            setTurns([
              WELCOME,
              {
                id: `a-hi-${Date.now()}`,
                role: 'assistant',
                content: `Thanks${firstName ? `, ${firstName}` : ''}! Now tell me what you're looking for — a subject, your level, or a budget — and I'll suggest programmes. You can ask to connect with a counsellor any time.`,
              },
            ])
          }}
          error={error}
        />
      ) : (
        <>
          {/*
            Messages. The height cap applies at every width, not just sm+: without
            it the log grows with the conversation on a phone and pushes the
            composer off the bottom of the page.
          */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="max-h-[55vh] min-h-[20rem] flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4 sm:max-h-[60vh]"
          >
            {turns.map((turn) => (
              <Turn key={turn.id} turn={turn} userName={userName} />
            ))}

            {thinking && (
              <div className="flex items-end gap-2.5">
                <Avatar role="assistant" userName={userName} />
                <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-soft">
                  <span className="sr-only">Finding courses…</span>
                  <span className="flex items-center gap-1" aria-hidden>
                    {/* Staggered delays turn three pulses into a "typing" ripple. */}
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

          {/* -------------------------------------------------------- composer */}
          <div className="border-t border-border p-3 sm:p-4">
            {error && (
              <p
                role="alert"
                className="mb-2.5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            {/* Live-agent handoff — always one tap away, and reflects its state. */}
            <div className="mb-2.5">
              {handoff === 'done' ? (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  A counsellor has been notified and will reach out to you shortly.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={requestAgent}
                  disabled={handoff === 'sending'}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-50 px-3.5 py-1.5 text-[12.5px] font-bold text-primary-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-soft disabled:opacity-60 dark:border-primary-500/40 dark:bg-primary-500/15 dark:text-primary-200"
                >
                  <Headset className="h-3.5 w-3.5 shrink-0" />
                  {handoff === 'sending' ? 'Connecting…' : 'Connect with a live agent'}
                </button>
              )}
            </div>

            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={thinking}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-left text-[12px] font-semibold text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:text-primary-600 disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3 shrink-0 text-primary-500" aria-hidden />
                  {s}
                </button>
              ))}
            </div>

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
                placeholder="e.g. I finished 12th commerce and can spend ₹40,000 a year"
                aria-label="Ask Sarthi"
                maxLength={500}
                className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-surface px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10"
              />
              <Button
                type="submit"
                variant="holo"
                size="icon"
                className="h-12 w-12 shrink-0"
                disabled={thinking || !input.trim()}
                aria-label="Send message"
              >
                <Send className="h-4.5 w-4.5" />
              </Button>
            </form>

            <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              This is a rule-based recommender over our course database, not a general-purpose AI. It
              cannot answer questions outside course selection.
              {!signedIn && ' Sign in if you would like this conversation saved for next time.'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ intro form */

/** Collects a name/email/phone for anonymous visitors and opens a counsellor lead. */
function IntroForm({
  onDone,
  onError,
  error,
}: {
  onDone: (leadId: string | null, firstName: string) => void
  onError: (msg: string) => void
  error: string
}) {
  const [form, setForm] = React.useState({ name: '', email: '', phone: '' })
  const [busy, setBusy] = React.useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const ready = form.name.trim().length >= 2 && /.+@.+\..+/.test(form.email) && form.phone.trim().length >= 8

  async function start(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    onError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'counsellor' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        onError(typeof data.error === 'string' ? data.error : 'Please check your details and try again.')
        return
      }
      onDone(typeof data.leadId === 'string' ? data.leadId : null, form.name.trim().split(/\s+/)[0])
    } catch {
      onError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-5 sm:p-6">
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        Hi! I&rsquo;m <span className="font-bold text-foreground">Sarthi</span>, your Shiksha Sarthi
        study guide. Leave your details so a counsellor can follow up if you&rsquo;d like — then ask me
        anything about our courses.
      </p>

      <form onSubmit={start} className="mt-4 space-y-3.5">
        <Field label="Your name" required>
          <Input value={form.name} onChange={set('name')} placeholder="e.g. Aditi Sharma" maxLength={80} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" maxLength={120} />
          </Field>
          <Field label="Phone" required>
            <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" maxLength={20} />
          </Field>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[12.5px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" variant="holo" size="lg" loading={busy} disabled={busy || !ready} className="w-full">
          {!busy && <Sparkles className="h-4 w-4" />}
          Start chatting with Sarthi
        </Button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          We use these only to help you with admissions — no spam. Sarthi answers from our real course
          catalogue and can connect you with a human counsellor whenever you want.
        </p>
      </form>
    </div>
  )
}

/* --------------------------------------------------------------------- turn */

function Turn({ turn, userName }: { turn: ChatTurn; userName: string }) {
  const isUser = turn.role === 'user'

  return (
    <div className={cn('flex items-end gap-2.5', isUser && 'flex-row-reverse')}>
      <Avatar role={turn.role} userName={userName} />

      <div className={cn('min-w-0 max-w-[85%] space-y-2.5 sm:max-w-[78%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-soft',
            isUser
              ? 'rounded-br-md bg-primary-600 text-white'
              : 'rounded-bl-md border border-border bg-card',
          )}
        >
          {turn.content}
        </div>

        {turn.courses && turn.courses.length > 0 && (
          <ul className="space-y-2">
            {turn.courses.map((c) => (
              <li key={c.id}>
                <RecCard course={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Avatar({ role, userName }: { role: 'user' | 'assistant'; userName: string }) {
  if (role === 'user') {
    return (
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-fade text-[10px] font-bold text-white"
        aria-hidden
      >
        {userName ? initials(userName) : 'You'.slice(0, 2)}
      </span>
    )
  }

  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-holo-sweep"
      aria-hidden
    >
      <Bot className="h-4 w-4 text-white" />
    </span>
  )
}

/* ---------------------------------------------------------- course card */

function RecCard({ course }: { course: CourseRec }) {
  const { has, toggle } = useCompare()
  const modeLabel = COURSE_MODES.find((m) => m.value === course.mode)?.label ?? course.mode

  return (
    <article className="card-base holo-ring-hover holo-ring overflow-hidden p-3.5">
      <div className="flex items-start gap-2.5">
        <UniversityMark name={course.university.name} size={34} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/courses/${course.slug}`}
            className="block text-[13.5px] font-bold leading-snug transition-colors hover:text-primary-600"
          >
            {course.title}
          </Link>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {course.university.name}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[15px] font-extrabold text-primary-700 dark:text-primary-300">
          {formatINR(course.feePerYear)}
          <span className="ml-1 text-[10.5px] font-medium text-muted-foreground">/ year</span>
        </span>
        <Stars rating={course.rating} count={course.reviews} size={11} />
        <span className="chip">
          {course.level} · {modeLabel}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/courses/${course.slug}`}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-700"
        >
          View Course
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/compare"
          onClick={() => {
            // Seed the comparison tray before we navigate to it.
            if (!has(course.id)) toggle(course.id)
          }}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
        >
          <GitCompare className="h-3.5 w-3.5" />
          Compare
        </Link>
      </div>
    </article>
  )
}
