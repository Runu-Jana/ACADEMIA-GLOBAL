import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { ApplyWizard, type WizardCourse } from './apply-wizard'
import { asList } from '@/lib/utils'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await prisma.course.findUnique({ where: { slug }, select: { title: true } })
  return {
    title: course ? `Apply · ${course.title}` : 'Apply',
    description: 'Complete your admission application in four quick steps.',
  }
}

/** Narrows a Prisma `Json` column to the flat string map the wizard expects. */
function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

function asProgram(value: unknown): { intake?: string; specialisation?: string; emi?: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = (value as Record<string, unknown>).program
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const p = raw as Record<string, unknown>
  return {
    intake: typeof p.intake === 'string' ? p.intake : undefined,
    specialisation: typeof p.specialisation === 'string' ? p.specialisation : undefined,
    emi: typeof p.emi === 'boolean' ? p.emi : undefined,
  }
}

/** Saved draft values win, but only when they actually hold something. */
function preferSaved(saved: string | undefined, fallback: string) {
  return saved && saved.trim() ? saved : fallback
}

export default async function ApplyPage({ params }: PageProps) {
  const { slug } = await params
  const user = await requireUser(`/apply/${slug}`)

  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      level: true,
      mode: true,
      stream: true,
      durationYears: true,
      feePerYear: true,
      originalFee: true,
      discountPct: true,
      examMode: true,
      eligibility: true,
      skills: true,
      university: { select: { name: true } },
    },
  })
  if (!course) notFound()

  const [application, enrollment] = await Promise.all([
    prisma.application.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      select: { step: true, status: true, personal: true, education: true },
    }),
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      select: { id: true },
    }),
  ])

  const savedPersonal = asStringMap(application?.personal)
  const savedEducation = asStringMap(application?.education)

  const wizardCourse: WizardCourse = {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    level: course.level,
    mode: course.mode,
    stream: course.stream,
    durationYears: course.durationYears,
    feePerYear: course.feePerYear,
    originalFee: course.originalFee,
    discountPct: course.discountPct,
    examMode: course.examMode,
    eligibility: course.eligibility,
    universityName: course.university.name,
    skills: asList(course.skills),
  }

  return (
    <ApplyWizard
      course={wizardCourse}
      initialStep={application?.step ?? 1}
      alreadyEnrolled={!!enrollment}
      alreadySubmitted={(application?.status ?? 'DRAFT') !== 'DRAFT'}
      initialPersonal={{
        // Step 1 is prefilled from the account, then overridden by any draft.
        fullName: preferSaved(savedPersonal.fullName, user.name),
        email: preferSaved(savedPersonal.email, user.email),
        mobile: preferSaved(savedPersonal.mobile, user.phone ?? ''),
        dob: preferSaved(savedPersonal.dob, user.dob ?? ''),
        gender: preferSaved(savedPersonal.gender, user.gender ?? ''),
        address: savedPersonal.address ?? '',
        city: preferSaved(savedPersonal.city, user.city ?? ''),
        state: preferSaved(savedPersonal.state, user.state ?? ''),
        pincode: savedPersonal.pincode ?? '',
      }}
      initialEducation={{
        qualification: savedEducation.qualification ?? '',
        board: savedEducation.board ?? '',
        institute: savedEducation.institute ?? '',
        yearOfPassing: savedEducation.yearOfPassing ?? '',
        percentage: savedEducation.percentage ?? '',
      }}
      initialProgram={asProgram(application?.education)}
    />
  )
}
