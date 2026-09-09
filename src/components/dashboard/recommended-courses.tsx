import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CourseCard } from '@/components/course/course-card'
import { PanelHeading } from '@/components/dashboard/primitives'
import { buttonVariants } from '@/components/ui/button'
import type { Recommendation } from '@/lib/recommendations'

/** The "Recommended for you" strip. Renders nothing when there's nothing to show. */
export function RecommendedCourses({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation.courses.length === 0) return null

  return (
    <section aria-labelledby="recommended-heading">
      <PanelHeading
        title="Recommended for you"
        sub={recommendation.basis}
        action={
          <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Explore all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <h2 id="recommended-heading" className="sr-only">Recommended for you</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {recommendation.courses.map((c) => (
          <CourseCard key={c.id} course={c} tilt={false} />
        ))}
      </div>
    </section>
  )
}
