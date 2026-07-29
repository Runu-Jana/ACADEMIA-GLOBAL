import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CountUp } from '@/components/fx/count-up'
import { cn } from '@/lib/utils'
import { MATERIAL_TYPES } from '@/lib/constants'

/* ------------------------------------------------------------------ header */

export function PageHeader({
  title,
  sub,
  actions,
  className,
}: {
  title: string
  sub?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-[26px]">{title}</h2>
        {sub && <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------- table */

/** Every admin table is wrapped in this so it scrolls instead of breaking 360px. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('-mx-px overflow-x-auto', className)}>
      <div className="min-w-[44rem] px-px">{children}</div>
    </div>
  )
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-3 align-middle text-[13px]', className)} {...props} />
}

export function TableEmpty({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-12 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

/** Shared <table> chrome: zebra-free, hairline rows, sticky-feeling head. */
export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <table className={cn('w-full border-collapse', className)}>{children}</table>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-border bg-muted/50">
      <tr>{children}</tr>
    </thead>
  )
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

/* -------------------------------------------------------------- stat tiles */

export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  tone = 'primary',
  format = 'number',
  suffix,
  delay = 0,
}: {
  label: string
  value: number
  icon: React.ElementType
  href?: string
  tone?: 'primary' | 'cyan' | 'violet' | 'green' | 'orange' | 'amber'
  format?: 'number' | 'compact'
  suffix?: string
  delay?: number
}) {
  const toneRing: Record<string, string> = {
    primary: 'from-primary-500/20 to-primary-600/5 text-primary-600 dark:text-primary-300',
    cyan: 'from-cyan-500/20 to-cyan-600/5 text-cyan-600 dark:text-cyan-300',
    violet: 'from-violet-500/20 to-violet-600/5 text-violet-600 dark:text-violet-300',
    green: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 dark:text-emerald-300',
    orange: 'from-orange-500/20 to-orange-600/5 text-orange-600 dark:text-orange-300',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-600 dark:text-amber-300',
  }

  const inner = (
    <div className="card-base holo-ring-hover holo-ring h-full p-4 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br',
            toneRing[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight">
        <CountUp to={value} format={format} suffix={suffix ?? ''} duration={1200 + delay} />
      </p>
    </div>
  )

  return href ? (
    <Link
      href={href}
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {inner}
    </Link>
  ) : (
    inner
  )
}

/* ------------------------------------------------------------------ badges */

type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'cyan' | 'orange'

const MATERIAL_TONE: Record<string, Tone> = {
  PDF: 'danger',
  NOTES: 'primary',
  TEST_PAPER: 'orange',
  SYLLABUS: 'cyan',
  ASSIGNMENT: 'violet',
  RECORDING: 'success',
}

export function materialTypeLabel(type: string) {
  return MATERIAL_TYPES.find((t) => t.value === type)?.label ?? type
}

export function MaterialTypeBadge({ type }: { type: string }) {
  return <Badge tone={MATERIAL_TONE[type] ?? 'default'}>{materialTypeLabel(type)}</Badge>
}

const APPLICATION_TONE: Record<string, Tone> = {
  DRAFT: 'default',
  SUBMITTED: 'primary',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  // Also cover the course review + partner request lifecycles.
  PENDING: 'warning',
  PUBLISHED: 'success',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={APPLICATION_TONE[status] ?? 'default'}>{status.replace(/_/g, ' ').toLowerCase()}</Badge>
  )
}

const ENROLLMENT_TONE: Record<string, Tone> = {
  ACTIVE: 'primary',
  COMPLETED: 'success',
  PAUSED: 'warning',
}

export function EnrollmentStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={ENROLLMENT_TONE[status] ?? 'default'}>{status.toLowerCase()}</Badge>
  )
}
