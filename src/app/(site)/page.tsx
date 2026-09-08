import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { liveCourses, liveUniversities } from '@/lib/visibility'
import { SectionTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { CourseCard } from '@/components/course/course-card'
import { Hero } from '@/components/home/hero'
import { JourneyPicker } from '@/components/home/journey-picker'
import { ExplorePrograms } from '@/components/home/explore-programs'
import { RestartPanel } from '@/components/home/restart-panel'
import { UniversityRail } from '@/components/home/university-rail'
import { TrustStrip, PopularExams, StoriesAndApp, BlogAndCta } from '@/components/home/home-sections'

// Content is seeded/admin-managed, so revalidate periodically rather than per request.
export const revalidate = 60

const courseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} as const

export default async function HomePage() {
  const [featured, universities, reviews] = await Promise.all([
    prisma.course.findMany({
      where: liveCourses({ featured: true }),
      select: courseSelect,
      orderBy: { rating: 'desc' },
      take: 8,
    }),
    prisma.university.findMany({
      where: liveUniversities({ featured: true }),
      select: { id: true, slug: true, name: true, shortName: true, rating: true, approvals: true },
      orderBy: { rating: 'desc' },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        body: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    }),
  ])

  const testimonials = reviews.map((r) => ({
    body: r.body,
    name: r.user.name,
    course: r.course.title,
  }))

  return (
    <>
      <Hero />
      <JourneyPicker />
      <ExplorePrograms />

      {/* ---------------------------------------------------- featured courses */}
      <section className="container py-10">
        <SectionTitle
          eyebrow="Trending"
          title="Popular Courses This Month"
          sub="Hand-picked programs from top UGC-entitled universities across India."
          action={
            <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              View All Courses
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <CourseCard course={c} />
            </Reveal>
          ))}
        </div>
      </section>

      <RestartPanel />

      {/* ---------------------------------------- universities + popular exams */}
      <section className="container py-10">
        <div className="grid gap-5 lg:grid-cols-[2.2fr_1fr]">
          <div className="min-w-0">
            <SectionTitle
              eyebrow="Institutions"
              title="Top Universities &amp; Institutions"
              action={
                <Link href="/universities" className="text-xs font-bold text-primary-600 hover:underline">
                  View All
                </Link>
              }
              className="mb-5"
            />
            <UniversityRail universities={universities} />
          </div>
          <PopularExams />
        </div>
      </section>

      <TrustStrip />
      <StoriesAndApp testimonials={testimonials} />
      <BlogAndCta />
    </>
  )
}
