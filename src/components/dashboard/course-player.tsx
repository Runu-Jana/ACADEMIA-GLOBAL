'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Play, Download,
  ClipboardList, Award, AlertCircle, Radio, BookOpen, MonitorPlay, Trophy, FolderOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button, buttonVariants } from '@/components/ui/button'
import { MaterialIcon, LessonTypeIcon, lessonTypeLabel } from './primitives'
import { TutorPanel } from './tutor-panel'
import { MATERIAL_TYPES } from '@/lib/constants'
import { cn, formatBytes, formatDate } from '@/lib/utils'

export type PlayerLesson = {
  id: string
  title: string
  description: string | null
  type: string
  durationMin: number
  body: string | null
}

export type PlayerModule = {
  id: string
  title: string
  description: string | null
  lessons: PlayerLesson[]
}

export type PlayerMaterial = {
  id: string
  title: string
  type: string
  fileUrl: string
  fileName: string
  fileSize: number
  createdAt: string
  moduleTitle: string | null
}

export type PlayerTest = {
  id: string
  title: string
  type: string
  totalMarks: number
  passMarks: number
  durationMin: number
  questionCount: number
  moduleTitle: string
  attempts: number
  bestScore: number | null
  bestTotal: number | null
  passed: boolean
}

type TabKey = 'modules' | 'material' | 'tests'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'modules', label: 'Modules', icon: BookOpen },
  { key: 'material', label: 'Study Material', icon: FolderOpen },
  { key: 'tests', label: 'Tests', icon: ClipboardList },
]

const TYPE_TONE: Record<string, 'cyan' | 'primary' | 'violet'> = {
  VIDEO: 'primary',
  READING: 'violet',
  LIVE: 'cyan',
}

export function CoursePlayer({
  courseId,
  courseTitle,
  courseSlug,
  universityName,
  userName,
  modules,
  materials,
  tests,
  completedLessonIds,
  initialProgressPct,
  initialLessonId,
  certificateSerial,
  initialAssessmentPending,
}: {
  courseId: string
  courseTitle: string
  courseSlug: string
  universityName: string
  userName: string
  modules: PlayerModule[]
  materials: PlayerMaterial[]
  tests: PlayerTest[]
  completedLessonIds: string[]
  initialProgressPct: number
  initialLessonId: string | null
  certificateSerial: string | null
  /** All lessons done but a course test still unpassed — no certificate yet. */
  initialAssessmentPending: boolean
}) {
  const router = useRouter()

  const flat = React.useMemo(
    () =>
      modules.flatMap((m) =>
        m.lessons.map((lesson) => ({ lesson, moduleId: m.id, moduleTitle: m.title })),
      ),
    [modules],
  )

  const [done, setDone] = React.useState<string[]>(completedLessonIds)
  const [progressPct, setProgressPct] = React.useState(initialProgressPct)
  const [serial, setSerial] = React.useState(certificateSerial)
  const [assessmentPending, setAssessmentPending] = React.useState(initialAssessmentPending)
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState('')
  const [tab, setTab] = React.useState<TabKey>('modules')

  const [activeId, setActiveId] = React.useState(() => {
    if (initialLessonId && flat.some((f) => f.lesson.id === initialLessonId)) return initialLessonId
    const firstIncomplete = flat.find((f) => !completedLessonIds.includes(f.lesson.id))
    return firstIncomplete?.lesson.id ?? flat[0]?.lesson.id ?? ''
  })

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const startId =
      initialLessonId && flat.some((f) => f.lesson.id === initialLessonId)
        ? initialLessonId
        : (flat.find((f) => !completedLessonIds.includes(f.lesson.id)) ?? flat[0])?.lesson.id
    const activeModuleId = flat.find((f) => f.lesson.id === startId)?.moduleId
    return Object.fromEntries(modules.map((m) => [m.id, m.id === activeModuleId]))
  })

  const doneSet = React.useMemo(() => new Set(done), [done])
  const activeIndex = flat.findIndex((f) => f.lesson.id === activeId)
  const active = activeIndex >= 0 ? flat[activeIndex] : null
  const prev = activeIndex > 0 ? flat[activeIndex - 1] : null
  const next = activeIndex >= 0 && activeIndex < flat.length - 1 ? flat[activeIndex + 1] : null
  const isDone = active ? doneSet.has(active.lesson.id) : false

  // Keep the module containing the selected lesson expanded.
  React.useEffect(() => {
    const entry = flat.find((f) => f.lesson.id === activeId)
    if (!entry) return
    setOpen((o) => (o[entry.moduleId] ? o : { ...o, [entry.moduleId]: true }))
  }, [activeId, flat])

  async function toggleLesson(lessonId: string) {
    if (pending) return
    const completed = !doneSet.has(lessonId)
    const snapshot = done

    setPending(lessonId)
    setError('')
    setDone(completed ? [...done, lessonId] : done.filter((id) => id !== lessonId))

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save your progress')

      setProgressPct(data.progressPct)
      if (data.certificate?.serial) setSerial(data.certificate.serial)
      setAssessmentPending(Boolean(data.assessmentPending))
      // Refresh the server tree so the rest of the dashboard sees the new number.
      router.refresh()
    } catch (err) {
      setDone(snapshot)
      setError(err instanceof Error ? err.message : 'Could not save your progress')
    } finally {
      setPending(null)
    }
  }

  const materialsByType = React.useMemo(() => {
    const groups = new Map<string, PlayerMaterial[]>()
    for (const m of materials) {
      const list = groups.get(m.type) ?? []
      list.push(m)
      groups.set(m.type, list)
    }
    return MATERIAL_TYPES.map((t) => ({
      type: t.value as string,
      label: t.label as string,
      items: groups.get(t.value) ?? [],
    })).filter((g) => g.items.length > 0)
  }, [materials])

  const completedCount = flat.filter((f) => doneSet.has(f.lesson.id)).length

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- header */}
      <div className="card-base holo-ring overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/learn"
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary-600"
              >
                <ChevronLeft className="h-3 w-3" />
                My Courses
              </Link>
              {serial && (
                <Badge tone="holo">
                  <Award className="h-3 w-3" />
                  Certificate issued
                </Badge>
              )}
              <div className="ml-auto">
                <TutorPanel
                  courseId={courseId}
                  courseTitle={courseTitle}
                  userName={userName}
                  lessonHint={active?.lesson.title ?? null}
                />
              </div>
            </div>

            <h2 className="mt-1.5 text-balance font-display text-xl font-extrabold tracking-tight sm:text-2xl">
              {courseTitle}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{universityName}</p>
          </div>

          <div className="w-full shrink-0 lg:w-72">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">
                {completedCount} of {flat.length} lessons complete
              </span>
              <span className="tabular-nums text-primary-700 dark:text-primary-300">{progressPct}%</span>
            </div>
            <Progress value={progressPct} holo />
            {assessmentPending && !serial && (
              <button
                type="button"
                onClick={() => setTab('tests')}
                className="mt-2 flex w-full items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-left text-[11.5px] font-medium text-amber-800 transition-colors hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Lessons done — <span className="font-bold underline">pass every test</span> to unlock
                  your certificate.
                </span>
              </button>
            )}
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Link
                href={`/courses/${courseSlug}`}
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'px-2' })}
              >
                Course details
              </Link>
              {serial && (
                <Link
                  href="/dashboard/certificates"
                  className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'px-2' })}
                >
                  View certificate
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* ------------------------------------------------- left panel */}
        <div className="order-2 lg:order-1">
          <div className="lg:sticky lg:top-[84px]">
            <div
              role="tablist"
              aria-label="Course content"
              className="mb-3 flex gap-1 rounded-xl border border-border bg-muted/60 p-1"
            >
              {TABS.map((t) => {
                const Icon = t.icon
                const selected = tab === t.key
                return (
                  <button
                    key={t.key}
                    role="tab"
                    id={`tab-${t.key}`}
                    aria-selected={selected}
                    aria-controls={`panel-${t.key}`}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-bold transition-all duration-300',
                      selected
                        ? 'bg-card text-primary-700 shadow-soft dark:text-primary-300'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="truncate">{t.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="lg:max-h-[calc(100dvh-190px)] lg:overflow-y-auto lg:pr-1">
              {/* ------------------------------------------- modules tab */}
              <div
                role="tabpanel"
                id="panel-modules"
                aria-labelledby="tab-modules"
                hidden={tab !== 'modules'}
              >
                <ul className="space-y-2.5">
                  {modules.map((m, mi) => {
                    const expanded = !!open[m.id]
                    const modDone = m.lessons.filter((l) => doneSet.has(l.id)).length
                    return (
                      <li key={m.id} className="card-base overflow-hidden">
                        <h3>
                          <button
                            type="button"
                            id={`accordion-${m.id}`}
                            aria-expanded={expanded}
                            aria-controls={`section-${m.id}`}
                            onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}
                            className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-muted/50"
                          >
                            <span
                              className={cn(
                                'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold',
                                modDone === m.lessons.length && m.lessons.length > 0
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                                  : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
                              )}
                            >
                              {modDone === m.lessons.length && m.lessons.length > 0 ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                String(mi + 1).padStart(2, '0')
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block text-[13px] font-bold leading-snug">
                                {m.title}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                {modDone}/{m.lessons.length} lessons
                              </span>
                            </span>
                            <ChevronDown
                              aria-hidden
                              className={cn(
                                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300',
                                expanded && 'rotate-180',
                              )}
                            />
                          </button>
                        </h3>

                        <div
                          id={`section-${m.id}`}
                          role="region"
                          aria-labelledby={`accordion-${m.id}`}
                          hidden={!expanded}
                          className="border-t border-border"
                        >
                          <ul>
                            {m.lessons.map((l) => {
                              const lessonDone = doneSet.has(l.id)
                              const selected = l.id === activeId
                              return (
                                <li
                                  key={l.id}
                                  className={cn(
                                    'flex items-center gap-2 border-b border-border/60 pl-2 pr-2.5 last:border-0',
                                    selected && 'bg-primary-50/70 dark:bg-primary-500/10',
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleLesson(l.id)}
                                    disabled={pending === l.id}
                                    aria-pressed={lessonDone}
                                    aria-label={
                                      lessonDone
                                        ? `Mark "${l.title}" as not complete`
                                        : `Mark "${l.title}" as complete`
                                    }
                                    className={cn(
                                      'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all duration-300',
                                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                                      lessonDone
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : 'border-input hover:border-primary-400',
                                      pending === l.id && 'opacity-50',
                                    )}
                                  >
                                    {lessonDone && <Check className="h-3 w-3" strokeWidth={3} />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setActiveId(l.id)}
                                    aria-current={selected ? 'true' : undefined}
                                    className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left"
                                  >
                                    <LessonTypeIcon
                                      type={l.type}
                                      className={cn(
                                        'h-3.5 w-3.5 shrink-0',
                                        selected ? 'text-primary-600 dark:text-primary-300' : 'text-muted-foreground',
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        'line-clamp-2 min-w-0 flex-1 text-[12.5px] leading-snug',
                                        selected ? 'font-bold text-primary-700 dark:text-primary-200' : 'font-medium',
                                        lessonDone && !selected && 'text-muted-foreground',
                                      )}
                                    >
                                      {l.title}
                                    </span>
                                    <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
                                      {l.durationMin}m
                                    </span>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* ------------------------------------------ material tab */}
              <div
                role="tabpanel"
                id="panel-material"
                aria-labelledby="tab-material"
                hidden={tab !== 'material'}
              >
                {materialsByType.length ? (
                  <div className="space-y-4">
                    {materialsByType.map((group) => (
                      <section key={group.type}>
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {group.label}
                        </h3>
                        <ul className="space-y-2">
                          {group.items.map((m) => (
                            <li key={m.id}>
                              <a
                                href={`/api/materials/${m.id}/download`}
                                download={m.fileName}
                                className="card-base card-hover flex items-center gap-3 p-3"
                              >
                                <MaterialIcon type={m.type} className="h-9 w-9" />
                                <span className="min-w-0 flex-1">
                                  <span className="line-clamp-2 block text-[12.5px] font-bold leading-snug">
                                    {m.title}
                                  </span>
                                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                    {formatBytes(m.fileSize)} · {formatDate(m.createdAt)}
                                  </span>
                                </span>
                                <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="card-base p-6 text-center text-sm text-muted-foreground">
                    No study material has been uploaded for this course yet.
                  </p>
                )}
              </div>

              {/* --------------------------------------------- tests tab */}
              <div role="tabpanel" id="panel-tests" aria-labelledby="tab-tests" hidden={tab !== 'tests'}>
                {tests.length ? (
                  <ul className="space-y-2.5">
                    {tests.map((t) => (
                      <li key={t.id} className="card-base card-hover p-3.5">
                        <div className="flex items-start gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                            <ClipboardList className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[12.5px] font-bold leading-snug">{t.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {t.questionCount} questions · {t.durationMin} min · pass {t.passMarks}/{t.totalMarks}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          {t.attempts > 0 ? (
                            <Badge tone={t.passed ? 'success' : 'warning'}>
                              <Trophy className="h-3 w-3" />
                              Best {t.bestScore}/{t.bestTotal}
                            </Badge>
                          ) : (
                            <Badge tone="default">Not attempted</Badge>
                          )}
                          <Link
                            href={`/dashboard/tests/${t.id}`}
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                          >
                            {t.attempts > 0 ? 'Retake' : 'Start'}
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="card-base p-6 text-center text-sm text-muted-foreground">
                    This course has no quizzes yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------- lesson viewer */}
        <div className="order-1 lg:order-2">
          {active ? (
            <article className="card-base holo-ring overflow-hidden">
              {active.lesson.type === 'READING' ? (
                <ReadingHeader lesson={active.lesson} moduleTitle={active.moduleTitle} />
              ) : (
                <PlayerPanel lesson={active.lesson} />
              )}

              <div className="p-4 sm:p-5">
                {active.lesson.type !== 'READING' && (
                  <LessonMeta lesson={active.lesson} moduleTitle={active.moduleTitle} />
                )}

                {active.lesson.type === 'READING' ? (
                  <div className="mt-1 space-y-3.5 text-[14.5px] leading-relaxed text-foreground/90">
                    {(active.lesson.body ?? active.lesson.description ?? 'Reading content for this lesson will be published shortly.')
                      .split(/\n{2,}/)
                      .map((para, i) => (
                        <p key={i} className="text-pretty">{para}</p>
                      ))}
                  </div>
                ) : (
                  active.lesson.description && (
                    <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {active.lesson.description}
                    </p>
                  )
                )}

                {/* ------------------------------------ complete + nav */}
                <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant={isDone ? 'outline' : 'holo'}
                    onClick={() => toggleLesson(active.lesson.id)}
                    loading={pending === active.lesson.id}
                    aria-pressed={isDone}
                    className="w-full sm:w-auto"
                  >
                    {!pending && (isDone ? <Check className="h-4 w-4" /> : null)}
                    {isDone ? 'Completed' : 'Mark as Complete'}
                  </Button>

                  <div className="flex gap-2 sm:ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!prev}
                      onClick={() => prev && setActiveId(prev.lesson.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!next}
                      onClick={() => next && setActiveId(next.lesson.id)}
                      className="flex-1 sm:flex-none"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {next && (
                  <p className="mt-3 line-clamp-1 text-[11.5px] text-muted-foreground">
                    Up next: <span className="font-semibold text-foreground/80">{next.lesson.title}</span>
                  </p>
                )}
              </div>
            </article>
          ) : (
            <div className="card-base p-10 text-center text-sm text-muted-foreground">
              This course doesn&rsquo;t have any lessons yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ bits */

function LessonMeta({ lesson, moduleTitle }: { lesson: PlayerLesson; moduleTitle: string }) {
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{moduleTitle}</p>
      <h3 className="mt-1 text-balance font-display text-xl font-extrabold tracking-tight sm:text-2xl">
        {lesson.title}
      </h3>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Badge tone={TYPE_TONE[lesson.type] ?? 'default'}>
          <LessonTypeIcon type={lesson.type} className="h-3 w-3" />
          {lessonTypeLabel(lesson.type)}
        </Badge>
        <span className="chip">
          <Clock className="h-3 w-3" />
          {lesson.durationMin} min
        </span>
      </div>
    </>
  )
}

function ReadingHeader({ lesson, moduleTitle }: { lesson: PlayerLesson; moduleTitle: string }) {
  return (
    <div className="border-b border-border bg-muted/40 p-4 sm:p-5">
      <LessonMeta lesson={lesson} moduleTitle={moduleTitle} />
    </div>
  )
}

/** Styled stand-in for the video/live player — no third-party embeds. */
function PlayerPanel({ lesson }: { lesson: PlayerLesson }) {
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
          className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-primary-700 shadow-lift transition-transform duration-500 ease-spring hover:scale-105"
        >
          <Play className="ml-1 h-7 w-7 fill-current" />
        </span>
        <p className="mt-4 text-sm font-bold text-white drop-shadow-sm">
          {live ? 'Live classroom session' : 'Lesson video'}
        </p>
        <p className="mt-1 text-[11.5px] text-white/75">
          {live
            ? 'The classroom link and recording appear here at class time.'
            : 'Video streaming is not attached in this environment.'}
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
