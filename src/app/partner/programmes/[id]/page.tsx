import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requirePartner } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { ProgrammeForm, type ProgrammeInitial } from '@/components/partner/programme-form'
import { asList } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const REVIEW: Record<string, { label: string; tone: 'default' | 'primary' | 'warning' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Draft', tone: 'default' },
  PENDING: { label: 'In review', tone: 'warning' },
  PUBLISHED: { label: 'Live', tone: 'success' },
  REJECTED: { label: 'Changes requested', tone: 'danger' },
}

export default async function EditProgrammePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requirePartner()
  if (!user.universityId) redirect('/partner')

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true, title: true, subtitle: true, level: true, mode: true, stream: true,
      durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
      about: true, eligibility: true, examMode: true,
      highlights: true, skills: true, recruiters: true,
      isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
      universityId: true, reviewStatus: true, reviewNote: true,
    },
  })
  // Not theirs (or not real) → indistinguishable from a wrong URL.
  if (!course || course.universityId !== user.universityId) notFound()

  const initial: ProgrammeInitial = {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    level: course.level,
    mode: course.mode,
    stream: course.stream,
    durationYears: course.durationYears,
    feePerYear: course.feePerYear,
    originalFee: course.originalFee,
    discountPct: course.discountPct,
    about: course.about,
    eligibility: course.eligibility,
    examMode: course.examMode,
    highlights: asList(course.highlights),
    skills: asList(course.skills),
    recruiters: asList(course.recruiters),
    isUgcEntitled: course.isUgcEntitled,
    hasPlacement: course.hasPlacement,
    hasLiveClass: course.hasLiveClass,
  }

  const badge = REVIEW[course.reviewStatus] ?? REVIEW.DRAFT

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/partner/programmes"
          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary-600"
        >
          <ChevronLeft className="h-3 w-3" />
          Programmes
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Edit programme</h1>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>

      {course.reviewStatus === 'REJECTED' && course.reviewNote && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <strong>Reviewer feedback:</strong> {course.reviewNote}
        </div>
      )}

      <ProgrammeForm course={initial} />
    </div>
  )
}
