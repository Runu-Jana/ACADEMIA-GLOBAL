import type { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Compass } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { CourseCard, type CourseCardData } from '@/components/course/course-card'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Saved Courses' }
export const dynamic = 'force-dynamic'

const courseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} as const

export default async function SavedPage() {
  const user = await requireUser('/dashboard/saved')

  const rows = await prisma.savedCourse.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { course: { select: courseSelect } },
  })
  const courses: CourseCardData[] = rows.map((r) => r.course)

  if (courses.length === 0) {
    return (
      <div className="card-base grid place-items-center px-6 py-16 text-center">
        <Heart aria-hidden className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-[15px] font-bold">No saved courses yet</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
          Tap the heart on any course to save it here and come back to it later.
        </p>
        <Link href="/courses" className={buttonVariants({ variant: 'primary', size: 'sm', className: 'mt-5' })}>
          <Compass className="h-4 w-4" />
          Browse courses
        </Link>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-[13px] text-muted-foreground">
        {courses.length} saved course{courses.length === 1 ? '' : 's'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} tilt={false} />
        ))}
      </div>
    </div>
  )
}
