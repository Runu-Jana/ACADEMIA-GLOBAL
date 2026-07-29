import Link from 'next/link'
import {
  Clock, GraduationCap, CheckCircle2, FileEdit, XCircle, Sparkles, Plus, ArrowRight, Hourglass,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requirePartner } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PartnerOverviewPage() {
  const user = await requirePartner()

  // ---------------------------------------------------------- pending state
  if (!user.universityId) {
    const application = await prisma.partnerApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    const rejected = application?.status === 'REJECTED'

    return (
      <div className="mx-auto max-w-2xl">
        <div className="card-base holo-ring p-6 text-center sm:p-8">
          <span
            className={cn(
              'mx-auto grid h-14 w-14 place-items-center rounded-2xl',
              rejected ? 'bg-red-50 text-red-600 dark:bg-red-500/15' : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15',
            )}
          >
            {rejected ? <XCircle className="h-7 w-7" /> : <Hourglass className="h-7 w-7" />}
          </span>

          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
            {rejected ? 'Application not approved' : 'Your application is under review'}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-pretty text-[14px] text-muted-foreground">
            {rejected ? (
              <>
                We weren&rsquo;t able to approve <strong>{application?.universityName}</strong> at this
                time.
                {application?.reviewNote ? ` ${application.reviewNote}` : ''} Please contact our team if
                you believe this was a mistake.
              </>
            ) : (
              <>
                Thanks for applying, {user.name.split(' ')[0]}. Our team is reviewing{' '}
                <strong>{application?.universityName ?? 'your institution'}</strong>. Once approved,
                this portal unlocks and you can start listing programmes.
              </>
            )}
          </p>

          {!rejected && (
            <div className="mx-auto mt-6 grid max-w-md gap-2.5 text-left">
              {[
                'We verify your institution and its recognised programmes.',
                'You get access to submit programmes — by form or by AI prospectus upload.',
                'Each programme goes live after a quick content review.',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          )}

          {application && (
            <p className="mt-6 text-[11.5px] text-muted-foreground">
              Applied on {formatDate(application.createdAt)}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------- active state
  const [university, counts] = await Promise.all([
    prisma.university.findUnique({
      where: { id: user.universityId },
      select: { name: true, partnerStatus: true, commissionPct: true },
    }),
    prisma.course.groupBy({
      by: ['reviewStatus'],
      where: { universityId: user.universityId },
      _count: { _all: true },
    }),
  ])

  const countOf = (s: string) => counts.find((c) => c.reviewStatus === s)?._count._all ?? 0
  const total = counts.reduce((n, c) => n + c._count._all, 0)

  const tiles = [
    { label: 'Live', value: countOf('PUBLISHED'), icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-300', ring: 'from-emerald-500/20 to-emerald-600/5' },
    { label: 'In review', value: countOf('PENDING'), icon: Clock, tone: 'text-amber-600 dark:text-amber-300', ring: 'from-amber-500/20 to-amber-600/5' },
    { label: 'Drafts', value: countOf('DRAFT'), icon: FileEdit, tone: 'text-primary-600 dark:text-primary-300', ring: 'from-primary-500/20 to-primary-600/5' },
    { label: 'Needs changes', value: countOf('REJECTED'), icon: XCircle, tone: 'text-red-600 dark:text-red-300', ring: 'from-red-500/20 to-red-600/5' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Managing <strong className="text-foreground">{university?.name}</strong>
            {typeof university?.commissionPct === 'number' && university.commissionPct > 0 && (
              <> · {university.commissionPct}% commission per admission</>
            )}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon
          return (
            <div key={t.label} className="card-base p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </p>
                <span className={cn('grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br', t.ring, t.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight tabular-nums">
                {t.value}
              </p>
            </div>
          )
        })}
      </div>

      {total === 0 ? (
        <div className="card-base holo-ring flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-holo-sweep text-white shadow-glow">
            <GraduationCap className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-extrabold">List your first programme</h2>
          <p className="mx-auto max-w-sm text-pretty text-[13.5px] text-muted-foreground">
            Add a programme by hand, or upload your prospectus and let our AI draft the structure for
            you to review.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link href="/partner/ingest" className={buttonVariants({ variant: 'outline' })}>
              <Sparkles className="h-4 w-4" />
              Upload a prospectus
            </Link>
            <Link href="/partner/programmes/new" className={buttonVariants({ variant: 'holo' })}>
              <Plus className="h-4 w-4" />
              Add manually
            </Link>
          </div>
        </div>
      ) : (
        <Link
          href="/partner/programmes"
          className="card-base card-hover flex items-center justify-between gap-3 p-4"
        >
          <div>
            <p className="text-[14px] font-bold">Manage your programmes</p>
            <p className="text-[12.5px] text-muted-foreground">
              {total} programme{total === 1 ? '' : 's'} · review status, edits and submissions
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      )}
    </div>
  )
}
