'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Timer, ChevronLeft, ChevronRight, Check, X, AlertCircle, Trophy,
  RotateCcw, Send, ClipboardList, ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressRing } from '@/components/ui/progress'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type RunnerQuestion = {
  id: string
  text: string
  options: string[]
  marks: number
}

type ReviewRow = {
  questionId: string
  correctIndex: number
  selectedIndex: number | null
  correct: boolean
}

type Result = {
  score: number
  totalMarks: number
  passMarks: number
  passed: boolean
  review: ReviewRow[]
}

function clock(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TestRunner({
  testId,
  title,
  typeLabel,
  durationMin,
  totalMarks,
  passMarks,
  courseId,
  courseTitle,
  moduleTitle,
  questions,
  attemptCount,
  previousBest,
  previousTotal,
}: {
  testId: string
  title: string
  typeLabel: string
  durationMin: number
  totalMarks: number
  passMarks: number
  courseId: string
  courseTitle: string
  moduleTitle: string
  questions: RunnerQuestion[]
  attemptCount: number
  previousBest: number | null
  previousTotal: number | null
}) {
  const router = useRouter()

  const [phase, setPhase] = React.useState<'intro' | 'taking' | 'result'>('intro')
  const [answers, setAnswers] = React.useState<Record<string, number>>({})
  const [index, setIndex] = React.useState(0)
  const [secondsLeft, setSecondsLeft] = React.useState(durationMin * 60)
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [result, setResult] = React.useState<Result | null>(null)

  const submittedRef = React.useRef(false)
  const answeredCount = Object.keys(answers).length
  const current = questions[index]

  /* ------------------------------------------------------------- timer */
  React.useEffect(() => {
    if (phase !== 'taking') return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  const submit = React.useCallback(
    async (auto = false) => {
      if (submittedRef.current) return
      submittedRef.current = true

      setBusy(true)
      setError('')
      setConfirming(false)

      try {
        const res = await fetch('/api/tests/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, answers }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not submit your answers')

        setResult({
          score: data.score,
          totalMarks: data.totalMarks,
          passMarks: data.passMarks,
          passed: data.passed,
          review: data.review ?? [],
        })
        setPhase('result')
        router.refresh()
      } catch (err) {
        submittedRef.current = false
        setError(
          err instanceof Error
            ? err.message
            : auto
              ? 'Time ran out but the submission failed. Please try again.'
              : 'Could not submit your answers',
        )
      } finally {
        setBusy(false)
      }
    },
    [answers, router, testId],
  )

  // Auto-submit the moment the clock runs out.
  React.useEffect(() => {
    if (phase === 'taking' && secondsLeft === 0) void submit(true)
  }, [phase, secondsLeft, submit])

  // Announce only at meaningful thresholds — a per-second live region is noise.
  const announcement =
    phase !== 'taking'
      ? ''
      : secondsLeft === 300
        ? '5 minutes remaining'
        : secondsLeft === 60
          ? '1 minute remaining'
          : secondsLeft === 30
            ? '30 seconds remaining'
            : ''

  function start() {
    submittedRef.current = false
    setAnswers({})
    setIndex(0)
    setSecondsLeft(durationMin * 60)
    setResult(null)
    setError('')
    setPhase('taking')
  }

  const lowTime = secondsLeft <= 60

  /* ------------------------------------------------------------- intro */
  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <Breadcrumb courseId={courseId} courseTitle={courseTitle} />

        <div className="card-base holo-ring mt-4 overflow-hidden">
          <div className="border-b border-border bg-muted/40 p-5 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-holo-sweep text-white shadow-glow mx-auto">
              <ClipboardList className="h-6 w-6" />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {moduleTitle}
            </p>
            <h2 className="mt-1 text-balance font-display text-xl font-extrabold tracking-tight sm:text-2xl">
              {title}
            </h2>
            <Badge tone="violet" className="mt-2.5">{typeLabel}</Badge>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border border-b border-border sm:grid-cols-4">
            <Fact label="Questions" value={String(questions.length)} />
            <Fact label="Total Marks" value={String(totalMarks)} />
            <Fact label="Pass Marks" value={String(passMarks)} />
            <Fact label="Duration" value={`${durationMin} min`} />
          </div>

          <div className="p-5">
            {attemptCount > 0 && previousBest !== null && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3.5">
                <Trophy className="h-4.5 w-4.5 shrink-0 text-accent-amber" />
                <p className="text-[13px]">
                  <span className="font-bold">Best so far: {previousBest}/{previousTotal}</span>
                  <span className="text-muted-foreground">
                    {' '}· {attemptCount} attempt{attemptCount === 1 ? '' : 's'}
                  </span>
                </p>
              </div>
            )}

            <ul className="space-y-2 text-[13px] text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                One correct answer per question — you can change it until you submit.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                The timer starts when you begin and auto-submits at zero.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                Answers are marked on the server; you can retake this test any time.
              </li>
            </ul>

            {questions.length === 0 ? (
              <p className="mt-5 rounded-xl border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                No questions have been added to this test yet.
              </p>
            ) : (
              <Button variant="holo" size="lg" onClick={start} className="mt-5 w-full">
                {attemptCount > 0 ? 'Retake Test' : 'Start Test'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------ result */
  if (phase === 'result' && result) {
    const scorePct = result.totalMarks ? Math.round((result.score / result.totalMarks) * 100) : 0
    const byQuestion = new Map(result.review.map((r) => [r.questionId, r]))

    return (
      <div className="mx-auto max-w-3xl">
        <Breadcrumb courseId={courseId} courseTitle={courseTitle} />

        <div className="card-base holo-ring mt-4 overflow-hidden">
          <div
            className={cn(
              'flex flex-col items-center gap-4 border-b border-border p-6 text-center sm:flex-row sm:text-left',
              result.passed
                ? 'bg-emerald-50/70 dark:bg-emerald-500/10'
                : 'bg-amber-50/70 dark:bg-amber-500/10',
            )}
          >
            <ProgressRing value={scorePct} size={92} stroke={8}>
              <span className="text-base font-extrabold">{scorePct}%</span>
            </ProgressRing>

            <div className="min-w-0 flex-1">
              <Badge tone={result.passed ? 'success' : 'warning'}>
                {result.passed ? 'Passed' : 'Not cleared'}
              </Badge>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                You scored {result.score} / {result.totalMarks}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {result.passed
                  ? `Comfortably above the pass mark of ${result.passMarks}. Well played.`
                  : `You need ${result.passMarks} to clear this test. Review the answers below and try again.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 border-b border-border p-4 sm:flex-row">
            <Button variant="outline" onClick={start} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
              Retake Test
            </Button>
            <Link
              href={`/dashboard/learn/${courseId}`}
              className={buttonVariants({ variant: 'primary', className: 'w-full sm:ml-auto sm:w-auto' })}
            >
              Back to Course
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="p-4 sm:p-5">
            <h3 className="mb-3 font-display text-base font-extrabold">Answer review</h3>
            <ol className="space-y-3">
              {questions.map((q, qi) => {
                const row = byQuestion.get(q.id)
                const chosen = row?.selectedIndex ?? null
                return (
                  <li key={q.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold',
                          row?.correct
                            ? 'bg-emerald-500 text-white'
                            : chosen === null
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-red-500 text-white',
                        )}
                      >
                        {row?.correct ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : qi + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">{q.text}</p>
                      <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                        {row?.correct ? `+${q.marks}` : '0'}
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1.5">
                      {q.options.map((opt, oi) => {
                        const isCorrect = row?.correctIndex === oi
                        const isChosen = chosen === oi
                        return (
                          <li
                            key={oi}
                            className={cn(
                              'flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px]',
                              isCorrect
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                                : isChosen
                                  ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200'
                                  : 'border-border text-muted-foreground',
                            )}
                          >
                            <span className="mt-px shrink-0">
                              {isCorrect ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              ) : isChosen ? (
                                <X className="h-3.5 w-3.5" strokeWidth={3} />
                              ) : (
                                <span className="block h-3.5 w-3.5 rounded-full border border-current opacity-40" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">{opt}</span>
                            {isCorrect && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                Correct
                              </span>
                            )}
                            {isChosen && !isCorrect && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider">
                                Your answer
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>

                    {chosen === null && (
                      <p className="mt-2 text-[11.5px] font-medium text-muted-foreground">
                        You didn&rsquo;t answer this question.
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------ taking */
  return (
    <div className="mx-auto max-w-3xl">
      <span aria-live="polite" className="sr-only">{announcement}</span>

      {/* --------------------------------------------------- status bar */}
      <div className="card-base sticky top-[72px] z-20 mb-4 p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[13px] font-bold">{title}</p>
            <p className="text-[11px] text-muted-foreground">
              Question {index + 1} of {questions.length} · {answeredCount} answered
            </p>
          </div>

          <div
            role="timer"
            aria-live="off"
            aria-atomic="true"
            aria-label={`Time remaining ${clock(secondsLeft)}`}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 font-bold tabular-nums',
              lowTime
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                : 'border-border bg-muted text-foreground',
            )}
          >
            <Timer className={cn('h-4 w-4', lowTime && 'animate-blink')} aria-hidden />
            {clock(secondsLeft)}
          </div>
        </div>

        <Progress
          value={questions.length ? ((index + 1) / questions.length) * 100 : 0}
          className="mt-3 h-1"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ---------------------------------------------------- question */}
      {current && (
        <fieldset className="card-base holo-ring p-4 sm:p-5">
          <legend className="sr-only">
            Question {index + 1} of {questions.length}
          </legend>

          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-50 text-[12px] font-bold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-pretty text-[15px] font-semibold leading-relaxed sm:text-base">
                {current.text}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                {current.marks} mark{current.marks === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {current.options.map((opt, oi) => {
              const selected = answers[current.id] === oi
              return (
                <label
                  key={oi}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-300',
                    selected
                      ? 'border-primary-400 bg-primary-50/70 shadow-soft dark:bg-primary-500/10'
                      : 'border-border hover:border-primary-300 hover:bg-muted/50',
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${current.id}`}
                    value={oi}
                    checked={selected}
                    onChange={() => setAnswers((a) => ({ ...a, [current.id]: oi }))}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      'mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                      selected ? 'border-primary-600 bg-primary-600' : 'border-input',
                    )}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className={cn('min-w-0 flex-1 text-[13.5px] leading-snug', selected && 'font-semibold')}>
                    {opt}
                  </span>
                </label>
              )
            })}
          </div>

          <div className="mt-5 flex gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>

            {index < questions.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                className="ml-auto"
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="holo" size="sm" className="ml-auto" onClick={() => setConfirming(true)}>
                <Send className="h-3.5 w-3.5" />
                Submit Test
              </Button>
            )}
          </div>
        </fieldset>
      )}

      {/* ------------------------------------------- question navigator */}
      <nav aria-label="Question navigation" className="card-base mt-4 p-4">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Questions
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {questions.map((q, qi) => {
            const answered = q.id in answers
            const isCurrent = qi === index
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setIndex(qi)}
                  aria-current={isCurrent ? 'true' : undefined}
                  aria-label={`Question ${qi + 1}${answered ? ', answered' : ', not answered'}`}
                  className={cn(
                    'h-9 w-9 rounded-lg border text-[12px] font-bold tabular-nums transition-all duration-300',
                    isCurrent
                      ? 'border-primary-500 bg-primary-600 text-white shadow-glow'
                      : answered
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-border text-muted-foreground hover:border-primary-300',
                  )}
                >
                  {qi + 1}
                </button>
              </li>
            )
          })}
        </ul>

        <Button variant="holo" onClick={() => setConfirming(true)} className="mt-4 w-full" loading={busy}>
          <Send className="h-4 w-4" />
          Submit Test
        </Button>
      </nav>

      {/* ------------------------------------------------ confirmation */}
      {confirming && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setConfirming(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
            className="relative w-full max-w-sm animate-scale-in rounded-2xl border border-border bg-card p-5 shadow-lift"
          >
            <h2 id="confirm-title" className="font-display text-lg font-extrabold">
              Submit this test?
            </h2>
            <p id="confirm-body" className="mt-1.5 text-sm text-muted-foreground">
              You&rsquo;ve answered <span className="font-bold text-foreground">{answeredCount}</span> of{' '}
              {questions.length} questions
              {answeredCount < questions.length && ' — unanswered questions score zero'}. You can retake
              the test afterwards.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1">
                Keep going
              </Button>
              <Button variant="holo" onClick={() => submit()} loading={busy} className="flex-1">
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 text-center">
      <p className="font-display text-lg font-extrabold">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  )
}

function Breadcrumb({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  return (
    <Link
      href={`/dashboard/learn/${courseId}`}
      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary-600"
    >
      <ChevronLeft className="h-3 w-3" />
      {courseTitle}
    </Link>
  )
}
