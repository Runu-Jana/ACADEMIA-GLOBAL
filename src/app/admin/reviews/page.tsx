import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgeCheck, ExternalLink, Inbox } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CourseReviewControl } from '@/components/admin/course-review'
import { COURSE_LEVELS, COURSE_MODES } from '@/lib/constants'
import { formatINR, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Programme Reviews' }
export const dynamic = 'force-dynamic'

const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((o) => o.value === v)?.label ?? v

export default async function AdminReviewsPage() {
  await requireAdmin()

  const pending = await prisma.course.findMany({
    where: { reviewStatus: 'PENDING' },
    orderBy: [{ submittedAt: 'asc' }],
    select: {
      id: true, slug: true, title: true, subtitle: true, level: true, mode: true,
      feePerYear: true, durationYears: true, submittedAt: true, about: true,
      university: { select: { name: true, partnerStatus: true } },
    },
  })

  return (
    <>
      <PageHeader
        title="Programme Reviews"
        sub="Partner-submitted programmes awaiting approval. Approving publishes them for students; rejecting returns them with a note."
      />

      {pending.length === 0 ? (
        <div className="card-base flex flex-col items-center gap-2 px-6 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
            <BadgeCheck className="h-7 w-7" />
          </span>
          <h3 className="text-lg font-extrabold">The queue is clear</h3>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">
            No programmes are waiting for review right now.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Inbox className="h-4 w-4" />
            {pending.length} programme{pending.length === 1 ? '' : 's'} awaiting review
          </div>

          <ul className="space-y-3">
            {pending.map((c) => (
              <li key={c.id} className="card-base p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold">{c.title}</h3>
                      <Badge tone="primary">{c.university.name}</Badge>
                      {c.university.partnerStatus !== 'ACTIVE' && (
                        <Badge tone="warning">Partner not active</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      {labelOf(COURSE_LEVELS, c.level)} · {labelOf(COURSE_MODES, c.mode)} ·{' '}
                      {c.durationYears} yr · {c.feePerYear > 0 ? `${formatINR(c.feePerYear)}/yr` : 'Free'}
                      {c.submittedAt && <> · submitted {formatDate(c.submittedAt)}</>}
                    </p>
                    <p className="mt-1.5 line-clamp-2 max-w-2xl text-[12.5px] text-muted-foreground">
                      {c.subtitle}
                    </p>
                    <Link
                      href={`/courses/${c.slug}?preview=1`}
                      target="_blank"
                      className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'mt-2 px-2' })}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview full listing
                    </Link>
                  </div>
                  <div className="shrink-0">
                    <CourseReviewControl courseId={c.id} title={c.title} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
