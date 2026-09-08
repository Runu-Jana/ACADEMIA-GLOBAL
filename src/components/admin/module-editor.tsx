'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  Loader2,
  AlertCircle,
  Video,
  BookOpen,
  Radio,
  GripVertical,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select, Textarea } from '@/components/ui/field'
import { LESSON_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export type LessonNode = {
  id: string
  title: string
  type: string
  durationMin: number
  description: string | null
  contentUrl: string | null
  transcript: string | null
}

export type ModuleNode = {
  id: string
  title: string
  description: string | null
  lessons: LessonNode[]
}

const LESSON_ICON: Record<string, React.ElementType> = {
  VIDEO: Video,
  READING: BookOpen,
  LIVE: Radio,
}

export function ModuleEditor({
  courseId,
  modules: initialModules,
}: {
  courseId: string
  modules: ModuleNode[]
}) {
  const router = useRouter()

  // Local mirror so reordering feels instant; the server is still authoritative
  // and router.refresh() reconciles after every mutation.
  const [modules, setModules] = React.useState<ModuleNode[]>(initialModules)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [newModule, setNewModule] = React.useState('')

  React.useEffect(() => {
    setModules(initialModules)
  }, [initialModules])

  async function call(url: string, init: RequestInit): Promise<Record<string, unknown> | null> {
    setError('')
    setBusy(true)
    try {
      const res = await fetch(url, {
        ...init,
        headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'That action failed. Please try again.')
        return null
      }
      return data
    } catch {
      setError('Network error — check your connection and try again.')
      return null
    } finally {
      setBusy(false)
    }
  }

  /* ---------------------------------------------------------------- modules */

  async function addModule(e: React.FormEvent) {
    e.preventDefault()
    const title = newModule.trim()
    if (title.length < 2) {
      setError('Module title must be at least 2 characters.')
      return
    }

    const data = await call('/api/admin/modules', {
      method: 'POST',
      body: JSON.stringify({ courseId, title }),
    })
    if (!data) return

    setNewModule('')
    router.refresh()
  }

  async function renameModule(id: string, title: string) {
    const data = await call(`/api/admin/modules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
    if (!data) return
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, title } : m)))
    router.refresh()
  }

  async function deleteModule(m: ModuleNode) {
    const lessonNote = m.lessons.length
      ? ` Its ${m.lessons.length} lesson${m.lessons.length === 1 ? '' : 's'} will be deleted too.`
      : ''
    if (!window.confirm(`Delete the module “${m.title}”?${lessonNote}`)) return

    const data = await call(`/api/admin/modules/${m.id}`, { method: 'DELETE' })
    if (!data) return
    setModules((ms) => ms.filter((x) => x.id !== m.id))
    router.refresh()
  }

  async function moveModule(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= modules.length) return

    const next = [...modules]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setModules(next)

    const data = await call('/api/admin/modules', {
      method: 'PATCH',
      body: JSON.stringify({ courseId, ids: next.map((m) => m.id) }),
    })
    if (!data) {
      setModules(modules) // roll back to the last known-good order
      return
    }
    router.refresh()
  }

  /* ---------------------------------------------------------------- lessons */

  async function addLesson(moduleId: string, title: string, type: string, durationMin: string) {
    const data = await call('/api/admin/lessons', {
      method: 'POST',
      body: JSON.stringify({ moduleId, title, type, durationMin }),
    })
    if (!data) return false
    router.refresh()
    return true
  }

  async function deleteLesson(moduleId: string, lesson: LessonNode) {
    if (!window.confirm(`Delete the lesson “${lesson.title}”?`)) return

    const data = await call(`/api/admin/lessons/${lesson.id}`, { method: 'DELETE' })
    if (!data) return
    setModules((ms) =>
      ms.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lesson.id) } : m,
      ),
    )
    router.refresh()
  }

  async function moveLesson(moduleId: string, index: number, direction: -1 | 1) {
    const mod = modules.find((m) => m.id === moduleId)
    if (!mod) return

    const target = index + direction
    if (target < 0 || target >= mod.lessons.length) return

    const lessons = [...mod.lessons]
    const [moved] = lessons.splice(index, 1)
    lessons.splice(target, 0, moved)

    const before = modules
    setModules((ms) => ms.map((m) => (m.id === moduleId ? { ...m, lessons } : m)))

    const data = await call('/api/admin/lessons', {
      method: 'PATCH',
      body: JSON.stringify({ moduleId, ids: lessons.map((l) => l.id) }),
    })
    if (!data) {
      setModules(before)
      return
    }
    router.refresh()
  }

  async function updateLesson(id: string, patch: Record<string, string>) {
    const data = await call(`/api/admin/lessons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    if (!data) return false
    router.refresh()
    return true
  }

  return (
    <section className="card-base p-4 sm:p-5" aria-labelledby="modules-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="modules-heading" className="text-[15px] font-bold">
            Modules &amp; Lessons
          </h3>
          <p className="text-[12px] text-muted-foreground">
            {modules.length} module{modules.length === 1 ? '' : 's'} ·{' '}
            {modules.reduce((n, m) => n + m.lessons.length, 0)} lesson
            {modules.reduce((n, m) => n + m.lessons.length, 0) === 1 ? '' : 's'}
          </p>
        </div>
        {busy && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <ol className="space-y-2.5">
        {modules.map((m, i) => (
          <ModuleRow
            key={m.id}
            module={m}
            index={i}
            total={modules.length}
            busy={busy}
            onRename={renameModule}
            onDelete={deleteModule}
            onMove={moveModule}
            onAddLesson={addLesson}
            onDeleteLesson={deleteLesson}
            onMoveLesson={moveLesson}
            onEditLesson={updateLesson}
          />
        ))}
      </ol>

      {modules.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No modules yet. Add the first one below.
        </p>
      )}

      <form onSubmit={addModule} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newModule}
          onChange={(e) => setNewModule(e.target.value)}
          placeholder="New module title — e.g. Semester 1: Foundations"
          maxLength={140}
          aria-label="New module title"
        />
        <Button type="submit" variant="outline" disabled={busy} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Module
        </Button>
      </form>
    </section>
  )
}

/* ------------------------------------------------------------------- module */

function ModuleRow({
  module: m,
  index,
  total,
  busy,
  onRename,
  onDelete,
  onMove,
  onAddLesson,
  onDeleteLesson,
  onMoveLesson,
  onEditLesson,
}: {
  module: ModuleNode
  index: number
  total: number
  busy: boolean
  onRename: (id: string, title: string) => void
  onDelete: (m: ModuleNode) => void
  onMove: (index: number, direction: -1 | 1) => void
  onAddLesson: (moduleId: string, title: string, type: string, durationMin: string) => Promise<boolean>
  onDeleteLesson: (moduleId: string, lesson: LessonNode) => void
  onMoveLesson: (moduleId: string, index: number, direction: -1 | 1) => void
  onEditLesson: (id: string, patch: Record<string, string>) => Promise<boolean>
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(m.title)
  const [editLessonId, setEditLessonId] = React.useState<string | null>(null)

  const [lessonTitle, setLessonTitle] = React.useState('')
  const [lessonType, setLessonType] = React.useState<string>(LESSON_TYPES[0])
  const [lessonMins, setLessonMins] = React.useState('15')

  React.useEffect(() => setDraft(m.title), [m.title])

  async function submitLesson(e: React.FormEvent) {
    e.preventDefault()
    if (lessonTitle.trim().length < 2) return
    const ok = await onAddLesson(m.id, lessonTitle.trim(), lessonType, lessonMins)
    if (ok) {
      setLessonTitle('')
      setLessonMins('15')
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 p-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
          {index + 1}
        </span>

        {editing ? (
          <>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9"
              aria-label="Module title"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                if (draft.trim().length >= 2 && draft.trim() !== m.title) onRename(m.id, draft.trim())
                setEditing(false)
              }}
              aria-label="Save module title"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-emerald-600 transition-colors hover:border-emerald-300"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(m.title)
                setEditing(false)
              }}
              aria-label="Cancel rename"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <GripVertical className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold">{m.title}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {m.lessons.length} lesson{m.lessons.length === 1 ? '' : 's'}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300',
                  open && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <IconBtn
                label={`Move “${m.title}” up`}
                disabled={busy || index === 0}
                onClick={() => onMove(index, -1)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                label={`Move “${m.title}” down`}
                disabled={busy || index === total - 1}
                onClick={() => onMove(index, 1)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label={`Rename “${m.title}”`} onClick={() => setEditing(true)} disabled={busy}>
                <Pencil className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label={`Delete “${m.title}”`} onClick={() => onDelete(m)} disabled={busy} danger>
                <Trash2 className="h-3.5 w-3.5" />
              </IconBtn>
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="border-t border-border bg-muted/30 p-2.5">
          <ol className="space-y-1.5">
            {m.lessons.map((l, li) => {
              const Icon = LESSON_ICON[l.type] ?? Video
              return (
                <li key={l.id} className="overflow-hidden rounded-lg border border-border bg-surface">
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary-500" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{l.title}</span>
                    {(l.contentUrl || l.transcript) && (
                      <span className="hidden shrink-0 items-center gap-1 sm:flex" title="Content attached">
                        {l.contentUrl && <Video className="h-3 w-3 text-emerald-500" aria-label="Video attached" />}
                        {l.transcript && <FileText className="h-3 w-3 text-emerald-500" aria-label="Transcript attached" />}
                      </span>
                    )}
                    <Badge tone="default" className="hidden shrink-0 sm:inline-flex">
                      {l.type.toLowerCase()}
                    </Badge>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {l.durationMin}m
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <IconBtn
                        label={`Edit content of “${l.title}”`}
                        onClick={() => setEditLessonId((cur) => (cur === l.id ? null : l.id))}
                        disabled={busy}
                      >
                        <Pencil className="h-3 w-3" />
                      </IconBtn>
                      <IconBtn
                        label={`Move “${l.title}” up`}
                        disabled={busy || li === 0}
                        onClick={() => onMoveLesson(m.id, li, -1)}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </IconBtn>
                      <IconBtn
                        label={`Move “${l.title}” down`}
                        disabled={busy || li === m.lessons.length - 1}
                        onClick={() => onMoveLesson(m.id, li, 1)}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </IconBtn>
                      <IconBtn
                        label={`Delete “${l.title}”`}
                        onClick={() => onDeleteLesson(m.id, l)}
                        disabled={busy}
                        danger
                      >
                        <Trash2 className="h-3 w-3" />
                      </IconBtn>
                    </span>
                  </div>
                  {editLessonId === l.id && (
                    <LessonEditForm
                      lesson={l}
                      busy={busy}
                      onSave={onEditLesson}
                      onClose={() => setEditLessonId(null)}
                    />
                  )}
                </li>
              )
            })}
          </ol>

          {m.lessons.length === 0 && (
            <p className="px-1 py-3 text-center text-[12.5px] text-muted-foreground">
              No lessons in this module yet.
            </p>
          )}

          <form onSubmit={submitLesson} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="New lesson title"
              maxLength={160}
              className="h-9"
              aria-label={`New lesson title for ${m.title}`}
            />
            <Select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value)}
              className="h-9 sm:w-32"
              aria-label="Lesson type"
            >
              {LESSON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min="1"
              max="600"
              value={lessonMins}
              onChange={(e) => setLessonMins(e.target.value)}
              className="h-9 sm:w-24"
              aria-label="Lesson duration in minutes"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={busy} className="h-9">
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </form>
        </div>
      )}
    </li>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition-colors disabled:opacity-40',
        danger
          ? 'hover:border-red-300 hover:text-red-600'
          : 'hover:border-primary-300 hover:text-primary-600',
      )}
    >
      {children}
    </button>
  )
}

/* --------------------------------------------------------------- lesson content */

function LessonEditForm({
  lesson,
  busy,
  onSave,
  onClose,
}: {
  lesson: LessonNode
  busy: boolean
  onSave: (id: string, patch: Record<string, string>) => Promise<boolean>
  onClose: () => void
}) {
  const [contentUrl, setContentUrl] = React.useState(lesson.contentUrl ?? '')
  const [description, setDescription] = React.useState(lesson.description ?? '')
  const [transcript, setTranscript] = React.useState(lesson.transcript ?? '')
  const [saving, setSaving] = React.useState(false)

  const isVideo = lesson.type === 'VIDEO'

  async function save() {
    if (saving) return
    setSaving(true)
    const ok = await onSave(lesson.id, {
      contentUrl: contentUrl.trim(),
      description: description.trim(),
      ...(isVideo ? { transcript: transcript.trim() } : {}),
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="space-y-3 border-t border-border bg-muted/30 p-3">
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold text-muted-foreground">Video URL</span>
        <Input
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          placeholder="YouTube, Vimeo, or a direct .mp4 / .webm link"
          maxLength={500}
          className="h-9"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-bold text-muted-foreground">Short description</span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One line shown under the lesson"
          maxLength={500}
          className="h-9"
        />
      </label>

      {isVideo && (
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-bold text-muted-foreground">
            Transcript <span className="font-normal">— shown to learners as a searchable read-along</span>
          </span>
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the lesson transcript or captions here…"
            maxLength={50000}
            className="min-h-[120px] text-[13px]"
          />
        </label>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={save}
          loading={saving}
          disabled={busy || saving}
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  )
}
