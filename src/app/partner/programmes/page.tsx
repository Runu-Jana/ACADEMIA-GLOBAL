import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Sparkles, GraduationCap, MessageSquareWarning } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requirePartner } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ProgrammeActions } from '@/components/partner/programme-actions'
import { COURSE_LEVELS, COURSE_MODES } from '@/lib/constants'
import { formatINR, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const REVIEW: Record<string, { label: string; tone: 'default' | 'primary' | 'warning' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Draft', tone: 'default' },
  PENDING: { label: 'In review', tone: 'warning' },
  PUBLISHED: { label: 'Live', tone: 'success' },
  REJECTED: { label: 'Changes requested', tone: 'danger' },
}

const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((o) => o.value === v)?.label ?? v

export default async function PartnerProgrammesPage() {
  const user = await requirePartner()
  if (!user.universityId) redirect('/partner')

  const programmes = await prisma.course.findMany({
    where: { universityId: user.universityId },
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      id: true, slug: true, title: true, level: true, mode: true,
      feePerYear: true, reviewStatus: true, reviewNote: true, updatedAt: true,
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Your programmes</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {programmes.length} programme{programmes.length === 1 ? '' : 's'} · drafts, submissions and live listings
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/partner/ingest" className={buttonVariants({ variant: 'outline' })}>
            <Sparkles className="h-4 w-4" />
            Add with AI
          </Link>
          <Link href="/partner/programmes/new" className={buttonVariants({ variant: 'holo' })}>
            <Plus className="h-4 w-4" />
            New programme
          </Link>
        </div>
      </div>

      {programmes.length === 0 ? (
        <div className="card-base holo-ring flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-holo-sweep text-white shadow-glow">
            <GraduationCap className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-extrabold">No programmes yet</h2>
          <p className="mx-auto max-w-sm text-pretty text-[13.5px] text-muted-foreground">
            Create your first programme by hand, or upload a prospectus and let AI draft it for you.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {programmes.map((p) => {
            const badge = REVIEW[p.reviewStatus] ?? REVIEW.DRAFT
            return (
              <li key={p.id} className="card-base p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold">{p.title}</h3>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      {labelOf(COURSE_LEVELS, p.level)} · {labelOf(COURSE_MODES, p.mode)} ·{' '}
                      {p.feePerYear > 0 ? `${formatINR(p.feePerYear)} / year` : 'Free'} · updated{' '}
                      {formatDate(p.updatedAt)}
                    </p>
                    {p.reviewStatus === 'REJECTED' && p.reviewNote && (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-[12px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span><strong>Reviewer:</strong> {p.reviewNote}</span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <ProgrammeActions id={p.id} status={p.reviewStatus} title={p.title} slug={p.slug} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
