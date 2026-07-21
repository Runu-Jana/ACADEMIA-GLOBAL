'use client'

import * as React from 'react'
import { Search, Download, X, FolderOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { TiltCard } from '@/components/fx/tilt-card'
import { MaterialIcon, materialLabel, EmptyState } from './primitives'
import { MATERIAL_TYPES } from '@/lib/constants'
import { cn, formatBytes, formatDate } from '@/lib/utils'

export type BrowserMaterial = {
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
  note: string | null
}

export function MaterialsBrowser({
  materials,
  courses,
  initialType = 'ALL',
  initialQuery = '',
  lockType = false,
  emptyTitle = 'No study material yet',
  emptyBody = 'Notes, PDFs, syllabi and recorded classes uploaded by your faculty will appear here.',
}: {
  materials: BrowserMaterial[]
  courses: { id: string; title: string }[]
  initialType?: string
  initialQuery?: string
  /** Assignments view pins the type filter and hides the type chips. */
  lockType?: boolean
  emptyTitle?: string
  emptyBody?: string
}) {
  const [type, setType] = React.useState(initialType)
  const [courseId, setCourseId] = React.useState('ALL')
  const [query, setQuery] = React.useState(initialQuery)

  const availableTypes = React.useMemo(() => {
    const present = new Set(materials.map((m) => m.type))
    return MATERIAL_TYPES.filter((t) => present.has(t.value))
  }, [materials])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return materials.filter((m) => {
      if (type !== 'ALL' && m.type !== type) return false
      if (courseId !== 'ALL' && m.courseId !== courseId) return false
      if (!q) return true
      return (
        m.title.toLowerCase().includes(q) ||
        m.courseTitle.toLowerCase().includes(q) ||
        (m.moduleTitle?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [materials, type, courseId, query])

  const filtersActive = (!lockType && type !== 'ALL') || courseId !== 'ALL' || query.trim() !== ''

  if (!materials.length) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={emptyTitle}
        body={emptyBody}
        actionHref="/dashboard/learn"
        actionLabel="Go to My Courses"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------ filters */}
      <div className="card-base space-y-3.5 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, course or module…"
            aria-label="Search study material"
            className="h-11 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-10 text-sm outline-none transition-all duration-300 placeholder:text-muted-foreground/80 focus:border-primary-300 focus:bg-surface focus:ring-4 focus:ring-primary-500/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {!lockType && availableTypes.length > 1 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Type
            </p>
            <div role="group" aria-label="Filter by material type" className="flex flex-wrap gap-1.5">
              <Chip active={type === 'ALL'} onClick={() => setType('ALL')}>
                All ({materials.length})
              </Chip>
              {availableTypes.map((t) => (
                <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                  {t.label} ({materials.filter((m) => m.type === t.value).length})
                </Chip>
              ))}
            </div>
          </div>
        )}

        {courses.length > 1 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Course
            </p>
            <div role="group" aria-label="Filter by course" className="flex flex-wrap gap-1.5">
              <Chip active={courseId === 'ALL'} onClick={() => setCourseId('ALL')}>
                All courses
              </Chip>
              {courses.map((c) => (
                <Chip key={c.id} active={courseId === c.id} onClick={() => setCourseId(c.id)}>
                  <span className="max-w-[180px] truncate">{c.title}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------ results */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted-foreground" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'file' : 'files'}
        </p>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              if (!lockType) setType('ALL')
              setCourseId('ALL')
              setQuery('')
            }}
            className="text-[12px] font-bold text-primary-600 transition-colors hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <li key={m.id}>
              <TiltCard className="group h-full" intensity={5} scale={1.01}>
                <article className="card-base holo-ring-hover flex h-full flex-col p-4">
                  <div className="flex items-start gap-3">
                    <MaterialIcon type={m.type} />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-[13.5px] font-bold leading-snug">{m.title}</h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {m.courseTitle}
                      </p>
                    </div>
                  </div>

                  {m.moduleTitle && (
                    <p className="mt-2.5 line-clamp-1 text-[11px] text-muted-foreground/85">
                      {m.moduleTitle}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone="default">{materialLabel(m.type)}</Badge>
                    <span className="chip">{formatBytes(m.fileSize)}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3.5">
                    <span className="text-[11px] text-muted-foreground">{formatDate(m.createdAt)}</span>
                    <a
                      href={`/api/materials/${m.id}/download`}
                      download={m.fileName}
                      aria-label={`Download ${m.title}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                </article>
              </TiltCard>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card-base grid place-items-center px-6 py-12 text-center">
          <p className="font-display text-base font-extrabold">Nothing matches those filters</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Try a different search term or clear the filters.
          </p>
        </div>
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all duration-300',
        active
          ? 'border-primary-500 bg-primary-600 text-white shadow-glow'
          : 'border-border bg-muted text-muted-foreground hover:border-primary-300 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
