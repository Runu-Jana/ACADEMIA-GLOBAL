import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { listedUniversityWhere, listedCourseWhere } from '@/lib/visibility'
import { Aurora, GridPattern } from '@/components/fx/aurora'
import { asList } from '@/lib/utils'
import { UniversityGrid, type UniversityCardData } from './university-grid'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Universities & Institutions',
  description:
    'Explore UGC-entitled universities offering online, distance and regular degree programs across India — with approvals, ratings, campuses and program counts.',
}

export default async function UniversitiesPage() {
  const rows = await prisma.university.findMany({
    // Active partners AND directory listings appear publicly; the programme count
    // reflects everything shown (published partner courses + directory listings).
    where: listedUniversityWhere,
    orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
    select: {
      id: true, slug: true, name: true, shortName: true, city: true, state: true,
      estYear: true, rating: true, reviews: true, students: true, naacGrade: true,
      approvals: true, partnerStatus: true,
      _count: { select: { courses: { where: listedCourseWhere } } },
    },
  })

  // `approvals` is a Json column, so it arrives as `unknown` — narrow it before
  // it crosses into the client grid.
  const universities: UniversityCardData[] = rows.map((u) => ({
    id: u.id,
    slug: u.slug,
    name: u.name,
    shortName: u.shortName,
    city: u.city,
    state: u.state,
    estYear: u.estYear,
    rating: u.rating,
    reviews: u.reviews,
    students: u.students,
    naacGrade: u.naacGrade,
    approvals: asList(u.approvals),
    courseCount: u._count.courses,
  }))

  const totalLearners = universities.reduce((n, u) => n + u.students, 0)

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">
        <Aurora palette="cool" density={3} />
        <GridPattern className="opacity-30" />

        <div className="container relative z-10 py-9 sm:py-12">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70 sm:text-xs">
              <li>
                <Link href="/" className="transition-colors hover:text-white">Home</Link>
              </li>
              <ChevronRight aria-hidden className="h-3 w-3" />
              <li aria-current="page" className="text-white">Universities</li>
            </ol>
          </nav>

          <h1 className="mt-3 text-balance text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.75rem]">
            Top <span className="holo-text">Universities</span> &amp; Institutions
          </h1>
          <p className="mt-2.5 max-w-xl text-pretty text-sm text-white/80 sm:text-[15px]">
            {universities.length} UGC-entitled institutions trusted by over{' '}
            {Math.round(totalLearners / 1000)}K learners across India. Compare approvals, ratings
            and programs before you apply.
          </p>
        </div>
      </section>

      <section className="container py-8 lg:py-10">
        <UniversityGrid universities={universities} />
      </section>
    </>
  )
}
