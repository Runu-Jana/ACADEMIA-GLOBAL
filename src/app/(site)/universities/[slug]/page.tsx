import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronRight, MapPin, CalendarDays, Users, BookOpen, BadgeCheck, Award, Globe,
  MessageSquare, ArrowRight, GraduationCap, Headset, Building2, Info,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { listedCourseWhere } from '@/lib/visibility'
import { LeadForm } from '@/components/lead/lead-form'
import { CourseCard } from '@/components/course/course-card'
import { UniversityMark } from '@/components/course/course-thumb'
import { Badge } from '@/components/ui/badge'
import { Stars } from '@/components/ui/stars'
import { buttonVariants } from '@/components/ui/button'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { Reveal } from '@/components/fx/reveal'
import { asList, cn, formatCount, formatDate, initials } from '@/lib/utils'
import { UniversityTabs, type UniversityTabItem } from './university-tabs'

const courseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} as const

/** Plain-language note for each accreditation badge, matched on keyword. */
function approvalNote(approval: string) {
  const key = approval.toLowerCase()

  if (key.includes('ugc'))
    return 'Entitled by the University Grants Commission to offer degrees in the online and distance modes. Under UGC rules these degrees hold the same standing as equivalent on-campus degrees.'
  if (key.includes('naac'))
    return 'Assessed and graded by the National Assessment and Accreditation Council, which audits teaching quality, infrastructure, research output and learner support.'
  if (key.includes('aicte'))
    return 'Approved by the All India Council for Technical Education for its technical and management programmes.'
  if (key.includes('wes'))
    return 'Recognised by World Education Services, so the degree can be evaluated for study or work in Canada and the United States.'
  if (key.includes('aiu'))
    return 'Member of the Association of Indian Universities, whose equivalence certificates are widely accepted for higher study and recruitment.'
  if (key.includes('nirf'))
    return 'Ranked under the National Institutional Ranking Framework published by the Ministry of Education.'

  return 'A recognised quality and compliance accreditation held by this institution.'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const university = await prisma.university.findUnique({
    where: { slug },
    select: { name: true, city: true, state: true, estYear: true, about: true },
  })

  if (!university) return { title: 'University Not Found' }

  const description = `${university.name} — established ${university.estYear}, ${university.city}, ${university.state}. Explore UGC-entitled online and distance degree programs, approvals, fees and reviews.`

  return {
    title: university.name,
    description,
    openGraph: { title: university.name, description, type: 'profile' },
  }
}

function StatTile({
  icon: Icon, label, value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="card-base holo-ring holo-ring-hover p-4 text-center">
      <Icon aria-hidden className="mx-auto h-5 w-5 text-primary-500" />
      <span className="mt-2 block text-xl font-extrabold leading-none">{value}</span>
      <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

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

export default async function UniversityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const university = await prisma.university.findUnique({
    where: { slug },
    include: {
      courses: {
        where: listedCourseWhere,
        select: courseSelect,
        orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
      },
    },
  })

  // Active partners AND directory listings have a public profile; internal
  // prospects (not listed) 404 until an operator lists or activates them.
  if (!university || (university.partnerStatus !== 'ACTIVE' && !university.listed)) notFound()

  // A listed non-partner: shown for information + lead-gen, not transactable.
  const isDirectory = university.partnerStatus !== 'ACTIVE'

  // Pre-fill the callback form for signed-in visitors; anonymous is fine too.
  const viewer = await getCurrentUser()
  const leadDefaults = viewer
    ? { name: viewer.name, email: viewer.email, phone: viewer.phone ?? undefined }
    : undefined

  const reviews = await prisma.review.findMany({
    where: { course: { universityId: university.id } },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true, rating: true, body: true, createdAt: true,
      user: { select: { name: true } },
      course: { select: { title: true, slug: true } },
    },
  })

  const approvals = asList(university.approvals)
  const courses = university.courses
  const headlineApproval = university.naacGrade
    ? `NAAC ${university.naacGrade}`
    : (approvals[0] ?? 'Recognised')

  const tabs: UniversityTabItem[] = [
    {
      id: 'about',
      label: 'About',
      content: (
        <div className="space-y-5">
          {isDirectory && (
            <Panel title="Get free admission help" className="holo-ring">
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-[12.5px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Shiksha Sarthi is not affiliated with {university.name}.</strong> This is an
                  informational directory listing — you can&rsquo;t enrol here through us. Share your
                  details and our counsellors will guide you to a recognised{' '}
                  <strong className="text-foreground">partner university</strong>, often faster and with
                  scholarships.
                </span>
              </div>
              <LeadForm
                source="directory"
                interestedUniversityId={university.id}
                defaults={leadDefaults}
                submitLabel="Get admission help"
              />
            </Panel>
          )}

          <Panel title={`About ${university.shortName}`}>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {university.about}
            </p>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { icon: CalendarDays, label: 'Established', value: String(university.estYear) },
                { icon: MapPin, label: 'Campus', value: `${university.city}, ${university.state}` },
                { icon: BookOpen, label: 'Programs on Shiksha Sarthi', value: String(courses.length) },
                { icon: Users, label: 'Learners Enrolled', value: formatCount(university.students) },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5"
                >
                  <row.icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-bold">{row.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Panel>

          {/* Enrolment-benefit copy implies you can join through us — true only for
              partner universities, so it's hidden on not-affiliated directory listings. */}
          {!isDirectory && (
            <Panel title="Why Students Choose It">
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {[
                  'Degrees recognised on par with on-campus programs',
                  'Learn entirely online with recorded and live sessions',
                  'Dedicated academic mentors and doubt-clearing support',
                  'Flexible examination slots with online proctoring',
                  'Digital library, e-journals and case-study repositories',
                  'Placement and career services for enrolled learners',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px]">
                    <BadgeCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
                    <span className="font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      ),
    },
    {
      id: 'accreditation',
      label: 'Accreditation',
      content: (
        <Panel title="Approvals & Recognitions">
          {approvals.length > 0 ? (
            <ul className="space-y-3">
              {approvals.map((a) => (
                <li
                  key={a}
                  className="flex items-start gap-3.5 rounded-xl border border-border bg-muted/40 p-4"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-holo-sweep shadow-glow"
                  >
                    <BadgeCheck className="h-5 w-5 text-white" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-extrabold">{a}</h4>
                    <p className="mt-1 text-pretty text-[13px] leading-relaxed text-muted-foreground">
                      {approvalNote(a)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Accreditation details for this institution are being updated.
            </p>
          )}

          {university.naacGrade && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4 dark:border-primary-500/25 dark:bg-primary-500/10">
              <Award aria-hidden className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-300" />
              <p className="text-[13px]">
                <strong className="font-extrabold">NAAC Grade {university.naacGrade}</strong>{' '}
                <span className="text-muted-foreground">
                  — awarded following an institutional quality assessment covering curriculum,
                  faculty, learner support and governance.
                </span>
              </p>
            </div>
          )}
        </Panel>
      ),
    },
    {
      id: 'programs',
      label: `Programs (${courses.length})`,
      content: (
        <>
          {isDirectory && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[12.5px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Shiksha Sarthi is not affiliated with {university.name}.</strong> This is an
                informational directory listing — you can&rsquo;t enrol here through us. Open any
                programme and request free admission help, and our counsellors will guide you to a
                recognised partner university.
              </span>
            </div>
          )}
          {courses.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
          <div className="card-base flex flex-col items-center gap-3 px-6 py-14 text-center">
            <GraduationCap aria-hidden className="h-9 w-9 text-muted-foreground/50" />
            <h3 className="text-base font-extrabold">No programs listed yet</h3>
            <p className="max-w-sm text-pretty text-sm text-muted-foreground">
              Programs from this institution will appear here as soon as admissions open.
            </p>
            <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Browse all courses
            </Link>
          </div>
          )}
        </>
      ),
    },
    {
      id: 'reviews',
      label: 'Reviews',
      content: (
        <Panel title="Student Reviews">
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
            <div className="text-center">
              <span className="block text-3xl font-extrabold leading-none text-primary-700 dark:text-primary-300">
                {university.rating.toFixed(1)}
              </span>
              <Stars rating={university.rating} showValue={false} className="mt-1.5" />
            </div>
            <p className="text-[13px] text-muted-foreground">
              Based on{' '}
              <strong className="font-bold text-foreground">
                {university.reviews.toLocaleString('en-IN')}
              </strong>{' '}
              verified learner ratings across all programs.
            </p>
          </div>

          {reviews.length > 0 ? (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-holo-sweep text-[11px] font-extrabold text-white"
                    >
                      {initials(r.user.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">{r.user.name}</p>
                      <Link
                        href={`/courses/${r.course.slug}`}
                        className="block truncate text-[11px] text-muted-foreground transition-colors hover:text-primary-600"
                      >
                        {r.course.title}
                      </Link>
                    </div>
                    <div className="shrink-0 text-right">
                      <Stars rating={r.rating} size={12} showValue={false} />
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
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
                Learner reviews for this institution will appear here.
              </p>
            </div>
          )}
        </Panel>
      ),
    },
    {
      id: 'contact',
      label: 'Contact',
      content: (
        <div className="space-y-5">
          <Panel title="Campus & Official Channels">
            <dl className="space-y-3">
              <div className="flex items-start gap-3.5 rounded-xl border border-border bg-muted/40 p-4">
                <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Campus
                  </dt>
                  <dd className="mt-0.5 text-[13px] font-bold">
                    {university.name}, {university.city}, {university.state}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-xl border border-border bg-muted/40 p-4">
                <Globe aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Official Website
                  </dt>
                  <dd className="mt-0.5 min-w-0 text-[13px] font-bold">
                    {university.website ? (
                      <a
                        href={university.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-primary-600 hover:underline dark:text-primary-300"
                      >
                        {university.website}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not published</span>
                    )}
                  </dd>
                </div>
              </div>
            </dl>
          </Panel>

          <Panel title="Need Help Deciding?">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span
                aria-hidden
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-holo-sweep shadow-glow"
              >
                <Headset className="h-6 w-6 text-white" />
              </span>
              <p className="flex-1 text-pretty text-[13px] leading-relaxed text-muted-foreground">
                {isDirectory ? (
                  <>
                    Shiksha Sarthi isn&rsquo;t affiliated with {university.shortName}, so you can&rsquo;t
                    enrol here through us. Our counsellors can still help you get admission to a
                    recognised partner university — eligibility, fee plans, scholarships and documents,
                    at no cost.
                  </>
                ) : (
                  <>
                    Admissions for {university.shortName} run through Shiksha Sarthi. Our counsellors
                    can walk you through eligibility, fee plans, scholarships and the documents you
                    need — at no cost.
                  </>
                )}
              </p>
              <Link
                href="/courses"
                className={buttonVariants({ variant: 'holo', size: 'sm', className: 'shrink-0' })}
              >
                Explore Programs
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Panel>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* ----------------------------------------------------- cover banner */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <Aurora palette="holo" density={4} />
        <GridPattern className="opacity-25" />

        <div className="container relative z-10 py-8 sm:py-11">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-white/70">
              <li>
                <Link href="/" className="transition-colors hover:text-white">Home</Link>
              </li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li>
                <Link href="/universities" className="transition-colors hover:text-white">
                  Universities
                </Link>
              </li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li aria-current="page" className="max-w-[14rem] truncate text-white sm:max-w-none">
                {university.name}
              </li>
            </ol>
          </nav>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
            <UniversityMark
              name={university.name}
              size={88}
              className="shrink-0 shadow-lift ring-4 ring-white/20"
            />

            <div className="min-w-0 flex-1">
              <h1 className="text-balance text-2xl font-extrabold leading-tight sm:text-3xl lg:text-[2.25rem]">
                {university.name}
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="h-3.5 w-3.5" />
                  {university.city}, {university.state}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                  Established {university.estYear}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 aria-hidden className="h-3.5 w-3.5" />
                  {courses.length} programs listed
                </span>
              </p>

              <div className="mt-3.5 flex flex-wrap gap-2">
                {approvals.map((a) => (
                  <Badge key={a} tone="holo">
                    <BadgeCheck className="h-3 w-3" />
                    {a}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Stars
                  rating={university.rating}
                  count={university.reviews}
                  size={15}
                  className="text-white"
                />
                <Link
                  href={`/courses?q=${encodeURIComponent(university.name)}`}
                  className={buttonVariants({ variant: 'glass', size: 'sm' })}
                >
                  View All Programs
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- stat tiles */}
      <section className="container -mt-px py-8">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <Reveal delay={0}>
            <StatTile icon={CalendarDays} label="Est. Year" value={String(university.estYear)} />
          </Reveal>
          <Reveal delay={60}>
            <StatTile icon={BookOpen} label="Programs" value={String(courses.length)} />
          </Reveal>
          <Reveal delay={120}>
            <StatTile icon={Users} label="Students" value={formatCount(university.students)} />
          </Reveal>
          <Reveal delay={180}>
            <StatTile icon={Award} label="Approval" value={headlineApproval} />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- tabs */}
      <section className="container pb-12">
        <UniversityTabs tabs={tabs} />
      </section>
    </>
  )
}
