'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Search,
  Loader2,
  Paperclip,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import {
  TableWrap,
  DataTable,
  Thead,
  Tbody,
  Th,
  Td,
  TableEmpty,
  MaterialTypeBadge,
} from './admin-ui'
import { MATERIAL_TYPES } from '@/lib/constants'
import { cn, formatBytes, formatDate } from '@/lib/utils'

/**
 * Mirrors the server allowlist in src/app/api/materials/_lib/upload.ts.
 * This copy exists purely for the file picker + instant feedback — the server
 * re-validates every field and never trusts anything below.
 */
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.mp4,.png,.jpg,.jpeg'
const ALLOWED_EXT = ACCEPT.split(',').map((e) => e.slice(1))
const MAX_BYTES = 25 * 1024 * 1024

export type CourseOption = { id: string; title: string }

export type MaterialRow = {
  id: string
  title: string
  type: string
  fileUrl: string
  fileName: string
  fileSize: number
  createdAt: string
  courseId: string
  courseTitle: string
  moduleTitle: string | null
  uploaderName: string | null
}

type ModuleOption = { id: string; title: string }
type Status =
  | { kind: 'idle' }
  | { kind: 'uploading'; pct: number }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export function MaterialManager({
  courses,
  materials,
}: {
  courses: CourseOption[]
  materials: MaterialRow[]
}) {
  const router = useRouter()

  /* ----------------------------------------------------------- form state */
  const [title, setTitle] = React.useState('')
  const [courseId, setCourseId] = React.useState('')
  const [moduleId, setModuleId] = React.useState('')
  const [type, setType] = React.useState<string>(MATERIAL_TYPES[0].value)
  const [note, setNote] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)

  const [modules, setModules] = React.useState<ModuleOption[]>([])
  const [modulesLoading, setModulesLoading] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' })

  const inputRef = React.useRef<HTMLInputElement>(null)

  /* --------------------------------------- dependent module list per course */
  React.useEffect(() => {
    setModuleId('')
    if (!courseId) {
      setModules([])
      return
    }

    const controller = new AbortController()
    setModulesLoading(true)

    fetch(`/api/admin/modules?courseId=${encodeURIComponent(courseId)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : { modules: [] }))
      .then((d: { modules?: ModuleOption[] }) => setModules(d.modules ?? []))
      .catch(() => {
        /* aborted or offline — the select simply stays empty */
      })
      .finally(() => setModulesLoading(false))

    return () => controller.abort()
  }, [courseId])

  /* ------------------------------------------------------------ file input */
  function acceptFile(next: File | null) {
    if (!next) return
    const ext = next.name.split('.').pop()?.toLowerCase() ?? ''

    if (!ALLOWED_EXT.includes(ext)) {
      setStatus({
        kind: 'error',
        message: `“.${ext || 'unknown'}” files are not allowed. Accepted: ${ALLOWED_EXT.join(', ')}.`,
      })
      return
    }
    if (next.size > MAX_BYTES) {
      setStatus({ kind: 'error', message: 'File is too large. The limit is 25 MB.' })
      return
    }

    setFile(next)
    setStatus({ kind: 'idle' })
    if (!title.trim()) {
      // Sensible default title from the filename, still fully editable.
      setTitle(next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 140))
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0] ?? null)
  }

  function clearFile() {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function resetForm() {
    setTitle('')
    setModuleId('')
    setNote('')
    clearFile()
  }

  /* ---------------------------------------------------------------- submit */
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status.kind === 'uploading') return

    if (!file) {
      setStatus({ kind: 'error', message: 'Choose a file to upload.' })
      return
    }
    if (!courseId) {
      setStatus({ kind: 'error', message: 'Choose the course this material belongs to.' })
      return
    }
    if (title.trim().length < 2) {
      setStatus({ kind: 'error', message: 'Give the material a title.' })
      return
    }

    const fd = new FormData()
    fd.set('title', title.trim())
    fd.set('courseId', courseId)
    fd.set('moduleId', moduleId)
    fd.set('type', type)
    fd.set('note', note.trim())
    fd.set('file', file)

    // XHR rather than fetch: only XHR reports upload progress.
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/materials/upload')

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return
      setStatus({ kind: 'uploading', pct: Math.round((ev.loaded / ev.total) * 100) })
    }

    xhr.onload = () => {
      let payload: { error?: string } = {}
      try {
        payload = JSON.parse(xhr.responseText || '{}')
      } catch {
        /* non-JSON error page */
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus({ kind: 'success', message: `“${title.trim()}” is now available to students.` })
        resetForm()
        router.refresh()
      } else {
        setStatus({
          kind: 'error',
          message: payload.error ?? `Upload failed (${xhr.status}). Please try again.`,
        })
      }
    }

    xhr.onerror = () =>
      setStatus({ kind: 'error', message: 'Network error — check your connection and try again.' })
    xhr.onabort = () => setStatus({ kind: 'idle' })

    setStatus({ kind: 'uploading', pct: 0 })
    xhr.send(fd)
  }

  /* ------------------------------------------------------------- deleting */
  const [deleting, setDeleting] = React.useState<string | null>(null)

  async function onDelete(m: MaterialRow) {
    if (!window.confirm(`Delete “${m.title}”? The file is removed for students immediately.`)) return

    setDeleting(m.id)
    try {
      const res = await fetch(`/api/materials/${m.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? 'Could not delete that material.' })
        return
      }
      setStatus({ kind: 'success', message: `“${m.title}” was deleted.` })
      router.refresh()
    } catch {
      setStatus({ kind: 'error', message: 'Network error while deleting. Please try again.' })
    } finally {
      setDeleting(null)
    }
  }

  /* -------------------------------------------------------- table filters */
  const [q, setQ] = React.useState('')
  const [filterCourse, setFilterCourse] = React.useState('')
  const [filterType, setFilterType] = React.useState('')

  const visible = React.useMemo(() => {
    const term = q.trim().toLowerCase()
    return materials.filter((m) => {
      if (filterCourse && m.courseId !== filterCourse) return false
      if (filterType && m.type !== filterType) return false
      if (!term) return true
      return (
        m.title.toLowerCase().includes(term) ||
        m.fileName.toLowerCase().includes(term) ||
        m.courseTitle.toLowerCase().includes(term) ||
        (m.moduleTitle ?? '').toLowerCase().includes(term)
      )
    })
  }, [materials, q, filterCourse, filterType])

  const uploading = status.kind === 'uploading'

  return (
    <div className="space-y-4">
      {/* =============================================== upload ============ */}
      <section className="card-base holo-ring holo-ring-hover p-4 sm:p-5" aria-labelledby="upload-heading">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-holo-sweep">
            <UploadCloud className="h-4.5 w-4.5 text-white" />
          </span>
          <div className="min-w-0">
            <h3 id="upload-heading" className="text-[15px] font-bold leading-tight">
              Upload Course Material
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Students see it in their course library the moment it finishes uploading.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
          {/* --------------------------------------------------- left: fields */}
          <div className="space-y-3.5">
            <Field label="Title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 3 — Consumer Behaviour Notes"
                maxLength={140}
                required
              />
            </Field>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Course" required>
                <Select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                  <option value="">Select a course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Module"
                hint={
                  !courseId
                    ? 'Pick a course first'
                    : modulesLoading
                      ? 'Loading modules…'
                      : modules.length === 0
                        ? 'No modules — attaches to the course'
                        : 'Optional'
                }
              >
                <Select
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  disabled={!courseId || modulesLoading || modules.length === 0}
                >
                  <option value="">Whole course</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Type" required>
              <Select value={type} onChange={(e) => setType(e.target.value)} required>
                {MATERIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Note" hint="Shown under the title in the student's library.">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything students should know before opening this file…"
                maxLength={500}
                className="min-h-[76px]"
              />
            </Field>
          </div>

          {/* ------------------------------------------------ right: dropzone */}
          <div className="flex flex-col">
            <label
              htmlFor="material-file"
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300',
                'min-h-[13rem]',
                dragging
                  ? 'border-primary-400 bg-primary-50/70 dark:bg-primary-500/10'
                  : 'border-border bg-muted/40 hover:border-primary-300 hover:bg-primary-50/40 dark:hover:bg-primary-500/5',
                'focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/10',
              )}
            >
              <input
                ref={inputRef}
                id="material-file"
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
              />

              {file ? (
                <span className="w-full">
                  <span className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="block break-all px-2 text-[13px] font-bold">{file.name}</span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      clearFile()
                    }}
                    disabled={uploading}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </span>
              ) : (
                <span>
                  <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface text-primary-600 shadow-soft transition-transform duration-300 group-hover:-translate-y-0.5 dark:text-primary-300">
                    <UploadCloud className="h-5.5 w-5.5" />
                  </span>
                  <span className="block text-[13.5px] font-bold">
                    Drop a file here, or <span className="text-primary-600 underline">browse</span>
                  </span>
                  <span className="mt-1.5 block text-[11.5px] leading-relaxed text-muted-foreground">
                    PDF, Word, PowerPoint, Excel, TXT, ZIP, MP4, PNG, JPG
                    <br />
                    Maximum 25 MB per file
                  </span>
                </span>
              )}
            </label>

            {/* --------------------------------------------------- feedback */}
            <div aria-live="polite" className="mt-3 space-y-3">
              {uploading && (
                <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-3 dark:border-primary-500/30 dark:bg-primary-500/10">
                  <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold text-primary-700 dark:text-primary-200">
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading…
                    </span>
                    <span className="tabular-nums">{status.pct}%</span>
                  </div>
                  <Progress value={status.pct} holo className="h-2" />
                </div>
              )}

              {status.kind === 'success' && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[13px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {status.message}
                </p>
              )}

              {status.kind === 'error' && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {status.message}
                </p>
              )}

              <Button
                type="submit"
                variant="holo"
                size="lg"
                loading={uploading}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Uploading…' : 'Upload Material'}
              </Button>
            </div>
          </div>
        </form>
      </section>

      {/* =============================================== library =========== */}
      <section className="card-base overflow-hidden" aria-labelledby="library-heading">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <h3 id="library-heading" className="text-[15px] font-bold leading-tight">
              Uploaded Material
            </h3>
            <p className="text-[12px] text-muted-foreground">
              {visible.length} of {materials.length} file{materials.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-56">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search material…"
                aria-label="Search uploaded material"
                className="h-10 w-full rounded-xl border border-input bg-surface pl-10 pr-3 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select
                aria-label="Filter by course"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="h-10 text-[13px] sm:w-44"
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>

              <Select
                aria-label="Filter by type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-10 text-[13px] sm:w-40"
              >
                <option value="">All types</option>
                {MATERIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <TableWrap>
          <DataTable>
            <Thead>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Course</Th>
              <Th>Module</Th>
              <Th>Size</Th>
              <Th>Uploaded</Th>
              <Th>By</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {visible.length === 0 && (
                <TableEmpty colSpan={8}>
                  {materials.length === 0
                    ? 'No material uploaded yet — use the form above to add the first file.'
                    : 'No material matches those filters.'}
                </TableEmpty>
              )}

              {visible.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-muted/40">
                  <Td className="max-w-[16rem]">
                    <span className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {m.fileName}
                        </span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <MaterialTypeBadge type={m.type} />
                  </Td>
                  <Td className="max-w-[13rem]">
                    <span className="line-clamp-2 text-[12.5px]">{m.courseTitle}</span>
                  </Td>
                  <Td className="max-w-[11rem]">
                    <span className="line-clamp-2 text-[12.5px] text-muted-foreground">
                      {m.moduleTitle ?? '—'}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatBytes(m.fileSize)}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(m.createdAt)}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{m.uploaderName ?? '—'}</Td>
                  <Td>
                    <span className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/api/materials/${m.id}/download`}
                        download={m.fileName}
                        title={`Download ${m.fileName}`}
                        aria-label={`Download ${m.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-600"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => onDelete(m)}
                        disabled={deleting === m.id}
                        title={`Delete ${m.title}`}
                        aria-label={`Delete ${m.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                      >
                        {deleting === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </span>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </DataTable>
        </TableWrap>
      </section>
    </div>
  )
}
