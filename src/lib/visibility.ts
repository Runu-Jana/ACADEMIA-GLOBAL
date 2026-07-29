import type { Prisma } from '@prisma/client'

/**
 * The one rule for whether a course may be shown to students.
 *
 * A course is live only when it has been approved (`reviewStatus = PUBLISHED`)
 * AND either it's our own PLATFORM programme or its university is an ACTIVE
 * partner. Every public or student-facing query that lists or looks up courses
 * MUST route through here — a single unguarded query leaks an unapproved or
 * non-partner programme into the storefront, which is exactly what the partner
 * review workflow exists to prevent.
 *
 * Operator (/admin) and the owning partner (/partner) deliberately bypass this
 * so they can see and preview work in progress.
 */
export const liveCourseWhere: Prisma.CourseWhereInput = {
  reviewStatus: 'PUBLISHED',
  OR: [{ source: 'PLATFORM' }, { university: { is: { partnerStatus: 'ACTIVE' } } }],
}

/**
 * Combines the live-course rule with a caller's own filter under an AND.
 *
 * Use this instead of spreading `liveCourseWhere` directly: the rule contains an
 * `OR`, and a caller that also has an `OR` (e.g. a search across title/subtitle)
 * would silently clobber one or the other if both sat at the same level.
 */
export function liveCourses(where?: Prisma.CourseWhereInput): Prisma.CourseWhereInput {
  return where ? { AND: [liveCourseWhere, where] } : liveCourseWhere
}

/** Whether an already-loaded course is live — for detail-page 404 guards. */
export function isCourseLive(course: {
  reviewStatus: string
  source: string
  university: { partnerStatus: string } | null
}): boolean {
  if (course.reviewStatus !== 'PUBLISHED') return false
  return course.source === 'PLATFORM' || course.university?.partnerStatus === 'ACTIVE'
}

/**
 * A university appears on public surfaces only once it's an ACTIVE partner.
 * Keeps unvetted sign-ups and prospects out of the directory and its counts.
 */
export const liveUniversityWhere: Prisma.UniversityWhereInput = {
  partnerStatus: 'ACTIVE',
}

export function liveUniversities(
  where?: Prisma.UniversityWhereInput,
): Prisma.UniversityWhereInput {
  return where ? { AND: [liveUniversityWhere, where] } : liveUniversityWhere
}
