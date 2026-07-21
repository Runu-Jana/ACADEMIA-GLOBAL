import Link from 'next/link'
import {
  FileText, NotebookPen, ClipboardList, ListChecks, PenSquare, Video,
  MonitorPlay, BookOpen, Radio, Inbox,
} from 'lucide-react'
import { TiltCard } from '@/components/fx/tilt-card'
import { buttonVariants } from '@/components/ui/button'
import { MATERIAL_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ icons */

const MATERIAL_ICONS: Record<string, React.ElementType> = {
  FileText,
  NotebookPen,
  ClipboardList,
  ListChecks,
  PenSquare,
  Video,
}

const MATERIAL_TONES: Record<string, string> = {
  PDF: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  NOTES: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  TEST_PAPER: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  SYLLABUS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  ASSIGNMENT: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  RECORDING: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
}

export function materialLabel(type: string) {
  return MATERIAL_TYPES.find((t) => t.value === type)?.label ?? type
}

export function materialTone(type: string) {
  return MATERIAL_TONES[type] ?? 'bg-muted text-muted-foreground'
}

/** Square icon tile matching the material's type. */
export function MaterialIcon({ type, className }: { type: string; className?: string }) {
  const iconName = MATERIAL_TYPES.find((t) => t.value === type)?.icon ?? 'FileText'
  const Icon = MATERIAL_ICONS[iconName] ?? FileText
  return (
    <span
      className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', materialTone(type), className)}
      aria-hidden
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  )
}

const LESSON_ICONS: Record<string, React.ElementType> = {
  VIDEO: MonitorPlay,
  READING: BookOpen,
  LIVE: Radio,
}

export function lessonTypeLabel(type: string) {
  if (type === 'VIDEO') return 'Video Lesson'
  if (type === 'READING') return 'Reading'
  if (type === 'LIVE') return 'Live Class'
  return type
}

export function LessonTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = LESSON_ICONS[type] ?? MonitorPlay
  return <Icon className={cn('h-4 w-4', className)} aria-hidden />
}

/* ------------------------------------------------------------- stat tile */

const STAT_TONES: Record<string, string> = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'primary',
  href,
  visual,
}: {
  label: string
  value?: React.ReactNode
  sub?: string
  icon?: React.ElementType
  tone?: keyof typeof STAT_TONES | string
  href?: string
  /** Replaces the numeric value — used for the progress ring tile. */
  visual?: React.ReactNode
}) {
  const inner = (
    <div className="card-base holo-ring-hover flex h-full items-center gap-3.5 p-4 sm:p-4.5">
      {visual ?? (
        Icon && (
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', STAT_TONES[tone] ?? STAT_TONES.primary)}>
            <Icon className="h-5 w-5" />
          </span>
        )
      )}
      <div className="min-w-0">
        {value !== undefined && (
          <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
        )}
        <p className={cn('truncate text-[12.5px] font-semibold text-muted-foreground', value !== undefined && 'mt-1.5')}>
          {label}
        </p>
        {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{sub}</p>}
      </div>
    </div>
  )

  const card = <TiltCard className="group h-full" intensity={5} scale={1.01}>{inner}</TiltCard>

  return href ? (
    <Link href={href} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      {card}
    </Link>
  ) : (
    card
  )
}

/* ----------------------------------------------------------- empty state */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  actionHref,
  actionLabel,
  className,
}: {
  icon?: React.ElementType
  title: string
  body: string
  actionHref?: string
  actionLabel?: string
  className?: string
}) {
  return (
    <div className={cn('card-base holo-ring grid place-items-center px-6 py-12 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-holo-sweep text-white shadow-glow">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className={buttonVariants({ variant: 'holo', className: 'mt-5' })}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

/* --------------------------------------------------------- panel heading */

export function PanelHeading({
  title,
  sub,
  action,
  className,
}: {
  title: string
  sub?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-extrabold tracking-tight sm:text-xl">{title}</h2>
        {sub && <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  )
}
