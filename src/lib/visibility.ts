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

// ===========================================================================
// Directory (aggregator) tier
//
// Two DIFFERENT gates now exist, and mixing them up leaks money or breaks trust:
//   - TRANSACTABLE (`live*` above) — a student can apply, enrol and PAY. Partner
//     ACTIVE + PUBLISHED, or PLATFORM. Keep this on /apply, /api/enroll, /api/payments.
//   - LISTED (`listed*` below) — merely SHOWN publicly for information + lead-gen.
//     Adds directory (AI-scraped, non-partner) universities and their display-only
//     courses. Use this on the browse/detail surfaces (/courses, /universities).
// A directory course is never transactable: applying to one raises a Lead.
// ===========================================================================

/** Display-only listings scraped from a non-partner university that we've chosen
 *  to surface (`University.listed`). */
export const directoryCourseWhere: Prisma.CourseWhereInput = {
  source: 'DIRECTORY',
  university: { is: { listed: true } },
}

/** Everything a visitor may SEE: transactable courses PLUS directory listings. */
export const listedCourseWhere: Prisma.CourseWhereInput = {
  OR: [liveCourseWhere, directoryCourseWhere],
}

export function listedCourses(where?: Prisma.CourseWhereInput): Prisma.CourseWhereInput {
  return where ? { AND: [listedCourseWhere, where] } : listedCourseWhere
}

/** Whether an already-loaded course may be shown (transactable OR directory). */
export function isCourseListed(course: {
  reviewStatus: string
  source: string
  university: { partnerStatus: string; listed: boolean } | null
}): boolean {
  if (isCourseLive(course)) return true
  return course.source === 'DIRECTORY' && Boolean(course.university?.listed)
}

/** A directory course is display-only — applying raises a Lead, never an enrolment. */
export function isDirectoryCourse(course: { source: string }): boolean {
  return course.source === 'DIRECTORY'
}

/** Universities shown publicly: ACTIVE partners OR listed directory entries. */
export const listedUniversityWhere: Prisma.UniversityWhereInput = {
  OR: [{ partnerStatus: 'ACTIVE' }, { listed: true }],
}

export function listedUniversities(
  where?: Prisma.UniversityWhereInput,
): Prisma.UniversityWhereInput {
  return where ? { AND: [listedUniversityWhere, where] } : listedUniversityWhere
}

/** A transactable partner (as opposed to a directory-only listing). */
export function isPartnerUniversity(university: { partnerStatus: string }): boolean {
  return university.partnerStatus === 'ACTIVE'
}

/* -------------------------------------------------------------------- shop */

/**
 * The one rule for whether a shop product may be shown to a buyer.
 *
 * Same discipline as courses: every public and student-facing product query
 * routes through here. An unguarded query leaks a DRAFT listing — a half-written
 * description with a placeholder price — straight onto the storefront, and worse,
 * into the sitemap where a crawler will remember it.
 *
 * Out-of-stock items deliberately stay VISIBLE. Hiding them would break the
 * product URL a student has bookmarked or a search engine has indexed; the page
 * says "Out of stock" and refuses add-to-cart instead.
 *
 * /admin bypasses this so operators can preview and edit unpublished rows.
 */
export const liveProductWhere: Prisma.ProductWhereInput = { status: 'PUBLISHED' }

export function liveProducts(where?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  return where ? { AND: [liveProductWhere, where] } : liveProductWhere
}

/** Whether an already-loaded product is live — for detail-page 404 guards. */
export function isProductLive(product: { status: string }): boolean {
  return product.status === 'PUBLISHED'
}

/** Sellable = publicly visible AND actually in stock. Gates add-to-cart and checkout. */
export function isProductSellable(product: { status: string; stock: number }): boolean {
  return isProductLive(product) && product.stock > 0
}
