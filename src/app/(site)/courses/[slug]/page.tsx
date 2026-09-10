import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronRight, ChevronDown, Clock, Monitor, ShieldCheck, Sparkles, Check,
  PlayCircle, FileText, Radio, Award, Briefcase, GraduationCap, MapPin, Users, CalendarDays,
  BadgeCheck, Wallet, MessageSquare, ArrowRight, BookOpen, Info,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isCourseLive, isCourseListed, isDirectoryCourse, listedCourses } from '@/lib/visibility'
import { LeadForm } from '@/components/lead/lead-form'
import { BrochureGate } from '@/components/course/brochure-gate'
import { CourseCard } from '@/components/course/course-card'
import { JsonLd } from '@/components/seo/json-ld'
import { courseLd, breadcrumbLd } from '@/lib/seo'
import { UniversityMark } from '@/components/course/course-thumb'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { Button, buttonVariants } from '@/components/ui/button'
import { SectionTitle } from '@/components/ui/card'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { Reveal } from '@/components/fx/reveal'
import { asList, cn, formatCount, formatDate, formatINR, initials } from '@/lib/utils'
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'
import { CourseTabs, type TabItem } from './course-tabs'
import { CompareButton } from './compare-button'
import { SaveButton } from '@/components/course/save-button'
import { ReviewForm } from '@/components/course/review-form'

const courseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} as const

const LESSON_META: Record<string, { icon: React.ElementType; label: string; tone: string }> = {
  VIDEO: { icon: PlayCircle, label: 'Video', tone: 'text-primary-500' },
  READING: { icon: FileText, label: 'Reading', tone: 'text-accent-green' },
  LIVE: { icon: Radio, label: 'Live Class', tone: 'text-accent-pink' },
}

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value

function minutesLabel(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`
}

function getCourse(slug: string) {
  return prisma.course.findUnique({
    where: { slug },
    include: {
      university: true,
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: { id: true, title: true, type: true, durationMin: true },
          },
        },
      },
      materials: {
        where: { type: 'SYLLABUS' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, title: true, fileUrl: true, fileName: true },
      },
      courseReview: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true, rating: true, body: true, createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { title: true, subtitle: true, university: { select: { name: true } } },
  })

  if (!course) return { title: 'Course Not Found' }

  const description = `${course.subtitle} Offered by ${course.university.name}. UGC-entitled, with live classes, placement assistance and flexible EMI options.`

  return {
    title: `${course.title} — ${course.university.name}`,
    description,
    openGraph: { title: course.title, description, type: 'article' },
  }
}

// ------------------------------------------------------------------ pieces

function Panel({
  title, children, className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('card-base p-5 sm:p-6', className)}>
      <h3 className="mb-4 text-base font-extrabold tracking-tight">{title}</h3>
      {children}
    </section>
  )
}

function Fact({
  icon: Icon, label, value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    // These tiles always sit on the dark hero, so they use a fixed dark-glass
    // rather than `.glass` (which turns near-white in light mode and left the
    // white text unreadable). Theme-independent by design.
    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-md">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/75">
        <Icon aria-hidden className="h-3 w-3" />
        {label}
      </span>
      <span className="mt-1 block truncate text-sm font-extrabold text-white">{value}</span>
    </div>
  )
}

/** The rail shown for a DIRECTORY (non-partner) course: a not-affiliated notice
 *  and a lead form. A counsellor follows up to guide the student — we do NOT
 *  recommend similar courses at other universities here. */
function DirectoryRail({
  universityName,
  courseId,
  defaults,
}: {
  universityName: string
  courseId: string
  defaults?: { name: string; email: string; phone?: string }
}) {
  return (
    <div className="space-y-4">
      <div className="card-base holo-ring overflow-hidden">
        <div className="border-b border-border bg-amber-50/70 p-4 dark:bg-amber-500/10">
          <Badge tone="warning">
            <Info className="h-3 w-3" />
            Directory listing
          </Badge>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Shiksha Sarthi is <strong className="text-foreground">not affiliated</strong> with{' '}
            {universityName}; this listing is compiled for information only. Share your details below
            and one of our counsellors will get in touch to guide you through the admission process.
          </p>
        </div>
        <div className="p-4">
          <h3 className="mb-2.5 text-[14px] font-bold">Request admission help</h3>
          <LeadForm
            source="directory"
            interestedCourseId={courseId}
            defaults={defaults}
            submitLabel="Request a callback"
          />
        </div>
      </div>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group card-base overflow-hidden">
      <summary
        className={cn(
          'flex min-h-12 cursor-pointer list-none items-center gap-3 p-4 text-[13px] font-bold',
          'transition-colors hover:text-primary-600 [&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="flex-1 text-pretty">{q}</span>
        <ChevronDown
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-spring group-open:rotate-180"
        />
      </summary>
      <p className="border-t border-border px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
        {a}
      </p>
    </details>
  )
}

// -------------------------------------------------------------------- page

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) notFound()

  const listed = isCourseListed(course)
  const directory = isDirectoryCourse(course)
  // Shown to admins/partners viewing something not yet publicly listed.
  const preview = !listed

  // Fetched once and reused: preview auth, the pre-filled lead form, the brochure
  // gate, and the enrolment-gated review form all need to know who is looking.
  const me = await getCurrentUser()

  // Not publicly listed → only an admin or the owning partner may preview it, so
  // a reviewer sees exactly what will publish. The viewer is reused to pre-fill
  // the lead form on a directory listing.
  const viewer = !listed || directory ? me : null
  if (!listed) {
    const canPreview =
      viewer?.role === 'ADMIN' ||
      (viewer?.role === 'PARTNER' && viewer.universityId === course.universityId)
    if (!canPreview) notFound()
  }
  const leadDefaults = viewer
    ? { name: viewer.name, email: viewer.email, phone: viewer.phone ?? undefined }
    : undefined

  const signedIn = Boolean(me)

  // A learner may review a course they are enrolled in — one review each, shown
  // pre-filled for editing. Both reads are skipped entirely for a signed-out visitor.
  const [myEnrollment, myReview] = me
    ? await Promise.all([
        prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: me.id, courseId: course.id } },
          select: { id: true },
        }),
        prisma.review.findUnique({
          where: { userId_courseId: { userId: me.id, courseId: course.id } },
          select: { rating: true, body: true },
        }),
      ])
    : [null, null]
  const canReview = Boolean(myEnrollment)

  // "Keep exploring" stays WITHIN the same university — we never recommend
  // similar courses at a different university while a student is deciding to
  // apply, so we don't pull their interest away to a competitor's programme.
  const related = await prisma.course.findMany({
    where: listedCourses({ universityId: course.universityId, id: { not: course.id } }),
    select: courseSelect,
    orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
    take: 4,
  })

  const highlights = asList(course.highlights)
  const skills = asList(course.skills)
  const recruiters = asList(course.recruiters)
  const approvals = asList(course.university.approvals)
  const syllabus = course.materials[0]

  const modeLabel = labelOf(COURSE_MODES, course.mode)
  const levelLabel = labelOf(COURSE_LEVELS, course.level)
  const streamLabel = labelOf(STREAMS, course.stream)

  const years = course.durationYears
  const durationLabel = `${years} ${years === 1 ? 'Year' : 'Years'}`
  const totalFee = Math.round(course.feePerYear * years)
  const months = Math.max(1, Math.round(years * 12))
  const emi = Math.round(totalFee / months)

  // A fractional final year (e.g. 1.5) bills pro-rata rather than a full year.
  const instalments = Array.from({ length: Math.ceil(years) }, (_, i) => {
    const share = Math.min(1, years - i)
    return {
      label: `Year ${i + 1}`,
      months: Math.round(share * 12),
      amount: Math.round(course.feePerYear * share),
    }
  })

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0)
  const totalMinutes = course.modules.reduce(
    (n, m) => n + m.lessons.reduce((x, l) => x + l.durationMin, 0),
    0,
  )

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-5">
          <Panel title="About this Program">
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {course.about}
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Modules', value: String(course.modules.length) },
                { label: 'Lessons', value: String(lessonCount) },
                { label: 'Learning Hours', value: minutesLabel(totalMinutes) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-muted/40 p-3.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </dt>
                  <dd className="mt-1 text-lg font-extrabold text-primary-700 dark:text-primary-300">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Key Highlights">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:border-primary-200"
                >
                  <span
                    aria-hidden
                    className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-green/15"
                  >
                    <Check className="h-3 w-3 text-accent-green" />
                  </span>
                  <span className="text-[13px] font-semibold leading-snug">{h}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Skills You Will Learn">
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5',
                    'text-[12px] font-bold text-primary-700 transition-all duration-300 hover:shadow-soft',
                    'dark:border-primary-500/25 dark:bg-primary-500/15 dark:text-primary-200',
                  )}
                >
                  <Sparkles aria-hidden className="h-3 w-3" />
                  {s}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      ),
    },
    {
      id: 'syllabus',
      label: 'Syllabus',
      content: (
        <div className="space-y-2.5">
          <p className="text-[13px] text-muted-foreground">
            {course.modules.length} modules · {lessonCount} lessons ·{' '}
            {minutesLabel(totalMinutes)} of content
          </p>

          {course.modules.map((m, i) => {
            const mins = m.lessons.reduce((x, l) => x + l.durationMin, 0)

            return (
              <details key={m.id} className="group card-base overflow-hidden">
                <summary
                  className={cn(
                    'flex cursor-pointer list-none items-center gap-3 p-4',
                    'transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden',
                  )}
                >
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-[13px] font-extrabold text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug">{m.title}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {m.lessons.length} {m.lessons.length === 1 ? 'lesson' : 'lessons'}
                      {mins > 0 && ` · ${minutesLabel(mins)}`}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-spring group-open:rotate-180"
                  />
                </summary>

                {m.lessons.length > 0 && (
                  <ul className="border-t border-border">
                    {m.lessons.map((l) => {
                      const meta = LESSON_META[l.type] ?? LESSON_META.VIDEO
                      const Icon = meta.icon

                      return (
                        <li
                          key={l.id}
                          className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0"
                        >
                          <Icon aria-hidden className={cn('h-4 w-4 shrink-0', meta.tone)} />
                          <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug">
                            {l.title}
                          </span>
                          <span className="chip hidden shrink-0 sm:inline-flex">{meta.label}</span>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {l.durationMin} min
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </details>
            )
          })}

          {course.modules.length === 0 && (
            <p className="card-base p-6 text-center text-sm text-muted-foreground">
              The detailed curriculum for this program is being finalised.
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'fees',
      label: 'Fees',
      content: (
        <div className="space-y-5">
          <Panel title="Fee Structure">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[340px] text-sm">
                <caption className="sr-only">Year-wise fee breakdown for {course.title}</caption>
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="py-2.5 font-bold">Instalment</th>
                    <th scope="col" className="py-2.5 font-bold">Period</th>
                    <th scope="col" className="py-2.5 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {instalments.map((row) => (
                    <tr key={row.label} className="border-b border-border/60">
                      <th scope="row" className="py-3 text-left text-[13px] font-bold">
                        {row.label}
                      </th>
                      <td className="py-3 text-[13px] text-muted-foreground">
                        {row.months} months
                      </td>
                      <td className="py-3 text-right text-[13px] font-bold tabular-nums">
                        {formatINR(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" className="py-3.5 text-left text-sm font-extrabold" colSpan={2}>
                      Total Program Fee
                    </th>
                    <td className="py-3.5 text-right text-base font-extrabold tabular-nums text-primary-700 dark:text-primary-300">
                      {formatINR(totalFee)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-3.5 dark:border-primary-500/25 dark:bg-primary-500/10">
              <Wallet aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" />
              <p className="text-[13px] leading-relaxed">
                <strong className="font-extrabold">EMI from {formatINR(emi)}/month</strong>{' '}
                <span className="text-muted-foreground">
                  over {months} months at 0% interest. Scholarships of up to{' '}
                  {course.discountPct > 0 ? `${course.discountPct}%` : '20%'} are available for
                  eligible students, defence personnel and differently-abled applicants.
                </span>
              </p>
            </div>
          </Panel>

          <Panel title="What the Fee Covers">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {[
                'Full digital course material & e-library access',
                'Recorded lectures available lifetime',
                course.hasLiveClass ? 'Live interactive classes with faculty' : 'Self-paced learning modules',
                'Online proctored examinations',
                'Degree certificate & marksheets',
                course.hasPlacement ? 'Placement assistance & career support' : 'Academic mentoring',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px]">
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
                  <span className="font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ),
    },
    {
      id: 'eligibility',
      label: 'Eligibility',
      content: (
        <div className="space-y-5">
          <Panel title="Who Can Apply">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <GraduationCap aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
              <p className="text-pretty text-sm font-semibold leading-relaxed">
                {course.eligibility}
              </p>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Programme Level', value: levelLabel },
                { label: 'Delivery Mode', value: modeLabel },
                { label: 'Examination Mode', value: course.examMode },
                { label: 'Programme Duration', value: durationLabel },
              ].map((row) => (
                <div key={row.label} className="rounded-xl border border-border p-3.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-1 text-[13px] font-bold">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Documents Required">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {[
                'Class 10 marksheet & certificate',
                'Class 12 marksheet & certificate',
                'Graduation marksheet (for PG programs)',
                'Government photo ID (Aadhaar / Passport)',
                'Passport-size photograph',
                'Category or reservation certificate, if applicable',
              ].map((doc) => (
                <li key={doc} className="flex items-start gap-2.5 text-[13px]">
                  <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                  <span className="font-medium leading-snug">{doc}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ),
    },
    {
      id: 'university',
      label: 'University',
      content: (
        <Panel title="About the University">
          <div className="flex items-start gap-4">
            <UniversityMark name={course.university.name} size={56} />
            <div className="min-w-0">
              <h4 className="text-base font-extrabold leading-snug">{course.university.name}</h4>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden className="h-3 w-3" />
                  {course.university.city}, {course.university.state}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays aria-hidden className="h-3 w-3" />
                  Est. {course.university.estYear}
                </span>
              </p>
              <Stars
                rating={course.university.rating}
                count={course.university.reviews}
                className="mt-2"
              />
            </div>
          </div>

          <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
            {course.university.about}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {approvals.map((a) => (
              <Badge key={a} tone="primary">
                <BadgeCheck className="h-3 w-3" />
                {a}
              </Badge>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: CalendarDays, label: 'Established', value: String(course.university.estYear) },
              { icon: BookOpen, label: 'Programs', value: `${course.university.programs}+` },
              { icon: Users, label: 'Students', value: formatCount(course.university.students) },
              { icon: Award, label: 'NAAC Grade', value: course.university.naacGrade ?? '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-muted/40 p-3">
                <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <s.icon aria-hidden className="h-3 w-3" />
                  {s.label}
                </dt>
                <dd className="mt-1 text-sm font-extrabold">{s.value}</dd>
              </div>
            ))}
          </dl>

          <Link
            href={`/universities/${course.university.slug}`}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-5' })}
          >
            View Full University Profile
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Panel>
      ),
    },
    {
      id: 'placements',
      label: 'Placements',
      content: (
        <div className="space-y-5">
          <Panel title="Top Recruiters">
            {recruiters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recruiters.map((r) => (
                  <span
                    key={r}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2',
                      'text-[13px] font-bold shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card',
                    )}
                  >
                    <UniversityMark name={r} size={20} />
                    {r}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Recruiter details for this program will be published shortly.
              </p>
            )}
          </Panel>

          <Panel title="Career Support">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {[
                'Dedicated placement cell & job portal access',
                'Resume building and LinkedIn profile reviews',
                'Mock interviews with industry mentors',
                'Soft-skills and aptitude training',
                'Virtual job fairs and hiring drives',
                'Internship referrals during the program',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3"
                >
                  <Briefcase aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                  <span className="text-[13px] font-semibold leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ),
    },
    {
      id: 'reviews',
      label: 'Reviews',
      content: (
        <Panel title={`Student Reviews (${course.reviews.toLocaleString('en-IN')})`}>
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
            <div className="text-center">
              <span className="block text-3xl font-extrabold leading-none text-primary-700 dark:text-primary-300">
                {course.rating.toFixed(1)}
              </span>
              <Stars rating={course.rating} showValue={false} className="mt-1.5" />
            </div>
            <p className="text-[13px] text-muted-foreground">
              Based on{' '}
              <strong className="font-bold text-foreground">
                {course.reviews.toLocaleString('en-IN')}
              </strong>{' '}
              verified learner ratings for this program.
            </p>
          </div>

          {canReview ? (
            <ReviewForm courseId={course.id} existing={myReview} />
          ) : signedIn ? (
            <p className="mb-5 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
              Enrol in this program to share your own review.
            </p>
          ) : (
            <p className="mb-5 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
              <Link
                href={`/login?returnTo=${encodeURIComponent(`/courses/${course.slug}`)}`}
                className="font-bold text-primary-600 hover:underline"
              >
                Sign in
              </Link>{' '}
              and enrol to write a review.
            </p>
          )}

          {course.courseReview.length > 0 ? (
            <ul className="space-y-3">
              {course.courseReview.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-holo-sweep text-[11px] font-extrabold text-white"
                    >
                      {initials(r.user.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-bold">
                        {r.user.name}
                        {r.user.id === me?.id && (
                          <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</p>
                    </div>
                    <Stars rating={r.rating} size={12} showValue={false} />
                  </div>
                  <p className="mt-2.5 text-pretty text-[13px] leading-relaxed text-muted-foreground">
                    {r.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageSquare aria-hidden className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold">No written reviews yet</p>
              <p className="text-[13px] text-muted-foreground">
                Be the first to share your experience once you enrol.
              </p>
            </div>
          )}
        </Panel>
      ),
    },
    {
      id: 'faqs',
      label: 'FAQs',
      content: (
        <div className="space-y-2.5">
          <Faq
            q={`Is the ${course.title} degree UGC entitled and valid for government jobs?`}
            a={
              course.isUgcEntitled
                ? `Yes. This program is offered by ${course.university.name}, whose online and distance degrees are UGC entitled. As per UGC guidelines, such degrees carry the same recognition as equivalent on-campus degrees and are accepted for government jobs, higher studies and PSU recruitment.`
                : `This program is offered by ${course.university.name} and is recognised by employers across India. Please speak to a counsellor about the specific approvals that apply to your intended career path.`
            }
          />
          <Faq
            q="How are the classes conducted?"
            a={`Learning is delivered ${modeLabel.toLowerCase()} through the Shiksha Sarthi platform. ${
              course.hasLiveClass
                ? 'You get live interactive sessions with faculty plus recorded lectures you can revisit any time,'
                : 'You get self-paced recorded lectures you can revisit any time,'
            } along with ${course.modules.length} modules of reading material, assignments and module quizzes. Examinations are conducted ${course.examMode.toLowerCase()}.`}
          />
          <Faq
            q="What is the total fee and can I pay in instalments?"
            a={`The program fee is ${formatINR(course.feePerYear)} per year, or ${formatINR(totalFee)} for the full ${durationLabel.toLowerCase()}. You can pay year by year, or opt for a no-cost EMI plan starting at approximately ${formatINR(emi)} per month over ${months} months. Scholarships are available for eligible candidates.`}
          />
          <Faq
            q="What are the eligibility criteria?"
            a={`${course.eligibility}. Candidates awaiting results may apply provisionally, and admission is confirmed once the final marksheet is submitted. There is no upper age limit for this program.`}
          />
          <Faq
            q="Will I get placement assistance after completing the program?"
            a={
              course.hasPlacement
                ? `Yes. Enrolled students get access to the placement cell, the job portal, resume and interview preparation, and virtual hiring drives with recruiters such as ${recruiters.slice(0, 3).join(', ') || 'leading Indian and global employers'}. Placement assistance is support for your job search — it is not a guaranteed job offer.`
                : 'This program focuses on academic and skill outcomes rather than campus placement. You still get career counselling, resume reviews and access to the Shiksha Sarthi alumni network.'
            }
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <JsonLd
        data={[
          courseLd(course),
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Courses', path: '/courses' },
            { name: course.title, path: `/courses/${course.slug}` },
          ]),
        ]}
      />
      {preview && (
        <div className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-center text-[12.5px] font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
          Preview — this programme is <span className="uppercase">{course.reviewStatus.toLowerCase()}</span> and not visible to students yet.
        </div>
      )}

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <Aurora palette="holo" density={3} />
        <GridPattern className="opacity-25" />

        <div className="container relative z-10 py-8 sm:py-11">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-white/70">
              <li>
                <Link href="/" className="transition-colors hover:text-white">Home</Link>
              </li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li>
                <Link href="/courses" className="transition-colors hover:text-white">Courses</Link>
              </li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li aria-current="page" className="max-w-[16rem] truncate text-white sm:max-w-none">
                {course.title}
              </li>
            </ol>
          </nav>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {course.isUgcEntitled && (
              <Badge tone="holo">
                <ShieldCheck className="h-3 w-3" />
                UGC Entitled
              </Badge>
            )}
            <span className="chip border-white/25 bg-white/10 text-white">{levelLabel}</span>
            <span className="chip border-white/25 bg-white/10 text-white">{streamLabel}</span>
            {course.discountPct > 0 && (
              <span className="rounded-full bg-accent-green px-2.5 py-0.5 text-[11px] font-bold leading-5 text-white">
                {course.discountPct}% OFF
              </span>
            )}
          </div>

          <h1 className="mt-3 max-w-3xl text-balance text-2xl font-extrabold leading-tight sm:text-3xl lg:text-[2.5rem]">
            {course.title}
          </h1>
          <p className="mt-2.5 max-w-2xl text-pretty text-sm text-white/80 sm:text-[15px]">
            {course.subtitle}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={`/universities/${course.university.slug}`}
              className="group flex items-center gap-2.5"
            >
              <UniversityMark name={course.university.name} size={32} />
              <span className="text-sm font-bold transition-colors group-hover:text-holo-cyan">
                {course.university.name}
              </span>
            </Link>
            <span aria-hidden className="hidden h-4 w-px bg-white/25 sm:block" />
            <Stars rating={course.rating} count={course.reviews} className="text-white" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:max-w-2xl sm:grid-cols-4">
            <Fact icon={Clock} label="Duration" value={durationLabel} />
            <Fact icon={Monitor} label="Mode" value={modeLabel} />
            <Fact
              icon={ShieldCheck}
              label="UGC"
              value={course.isUgcEntitled ? 'Entitled' : 'Recognised'}
            />
            <Fact icon={Sparkles} label="AI Support" value="24/7 Mentor" />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- content + rail */}
      <section className="container py-8 lg:py-10">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px] xl:gap-8">
          {/* Rail first in the DOM so the price and CTA lead on mobile. */}
          <aside className="lg:order-2 lg:sticky lg:top-24">
            {directory ? (
              <DirectoryRail
                universityName={course.university.name}
                courseId={course.id}
                defaults={leadDefaults}
              />
            ) : (
            <div className="card-base holo-ring overflow-hidden">
              <div className="border-b border-border bg-muted/40 p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Program Fee
                </p>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-extrabold leading-none text-primary-700 dark:text-primary-300">
                    {formatINR(course.feePerYear)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">/ year</span>
                </div>

                {course.originalFee && course.originalFee > course.feePerYear && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground line-through">
                      {formatINR(course.originalFee)}
                    </span>
                    {course.discountPct > 0 && (
                      <Badge tone="success">Save {course.discountPct}%</Badge>
                    )}
                  </div>
                )}

                <dl className="mt-4 space-y-1.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Total ({durationLabel})</dt>
                    <dd className="font-extrabold tabular-nums">{formatINR(totalFee)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">EMI from</dt>
                    <dd className="font-extrabold tabular-nums text-accent-green">
                      {formatINR(emi)}/mo
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2.5 p-5">
                <Link
                  href={`/apply/${course.slug}`}
                  className={buttonVariants({ variant: 'holo', className: 'w-full' })}
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <BrochureGate
                  slug={course.slug}
                  courseId={course.id}
                  courseTitle={course.title}
                  signedIn={signedIn}
                />

                {syllabus && (
                  <a
                    href={`/api/materials/${syllabus.id}/download`}
                    download={syllabus.fileName}
                    className="flex items-center justify-center gap-1.5 pt-0.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-primary-600"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Full syllabus (PDF)
                  </a>
                )}

                <SaveButton courseId={course.id} variant="chip" className="w-full justify-center" />
                <CompareButton courseId={course.id} />
              </div>

              <ul className="space-y-2 border-t border-border bg-muted/30 p-5">
                {[
                  course.isUgcEntitled && 'UGC entitled degree',
                  course.hasLiveClass && 'Live + recorded classes',
                  course.hasPlacement && 'Placement assistance',
                  'No-cost EMI available',
                ]
                  .filter((v): v is string => typeof v === 'string')
                  .map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[13px] font-semibold">
                      <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent-green" />
                      {item}
                    </li>
                  ))}
              </ul>
            </div>
            )}
          </aside>

          <div className="min-w-0 lg:order-1">
            <CourseTabs tabs={tabs} />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- related courses */}
      {related.length > 0 && (
        <section className="container pb-12 pt-2">
          <SectionTitle
            eyebrow="Keep exploring"
            title={`More from ${course.university.shortName || course.university.name}`}
            sub="Other programmes offered by the same university."
            action={
              <Link
                href={`/universities/${course.university.slug}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                View University
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((c, i) => (
              <Reveal key={c.id} delay={i * 60}>
                <CourseCard course={c} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
