import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { listedCourses, listedUniversities, liveProducts } from '@/lib/visibility'
import { searchExams, type Exam } from '@/lib/exams'
import type { CourseCardData } from '@/components/course/course-card'
import type { ProductCardData } from '@/components/shop/product-card'

/**
 * One universal search across everything a visitor can see: listed courses,
 * listed universities, published shop products and the static exam directory.
 *
 * The single source of truth for both the header typeahead (`/api/search`) and
 * the full `/search` results page, so the two can never drift. Every DB query
 * routes through the visibility gates in `lib/visibility` — an unguarded search
 * would leak a draft product or an unapproved course straight into the results.
 */

/** A university trimmed to what a result row needs — no per-row course count query. */
export type UniversityHit = {
  id: string
  slug: string
  name: string
  shortName: string
  city: string
  state: string
  rating: number
  reviews: number
}

export type SearchResults = {
  q: string
  courses: CourseCardData[]
  universities: UniversityHit[]
  products: ProductCardData[]
  exams: Exam[]
  /** Total hits across every group — drives "no results" and the result count. */
  total: number
}

/** Per-group caps. The typeahead wants a handful; the full page wants a gridful. */
export type SearchLimits = {
  courses?: number
  universities?: number
  products?: number
  exams?: number
}

const TYPEAHEAD_LIMITS: Required<SearchLimits> = {
  courses: 5,
  universities: 3,
  products: 4,
  exams: 4,
}

/** Below two characters a search is all noise — skip the DB round trips. */
export const MIN_QUERY = 2

const courseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} satisfies Prisma.CourseSelect

const productSelect = {
  id: true, slug: true, title: true, subtitle: true, kind: true, category: true,
  price: true, mrp: true, stock: true, rating: true, reviews: true,
  author: true, brand: true, imageUrl: true,
} satisfies Prisma.ProductSelect

const universitySelect = {
  id: true, slug: true, name: true, shortName: true, city: true, state: true,
  rating: true, reviews: true,
} satisfies Prisma.UniversitySelect

function empty(q: string): SearchResults {
  return { q, courses: [], universities: [], products: [], exams: [], total: 0 }
}

export async function searchAll(rawQ: string, limits: SearchLimits = {}): Promise<SearchResults> {
  const q = rawQ.trim().slice(0, 120)
  if (q.length < MIN_QUERY) return empty(q)

  const take = { ...TYPEAHEAD_LIMITS, ...limits }
  const like = { contains: q, mode: 'insensitive' as const }

  const [courses, universities, products] = await Promise.all([
    take.courses > 0
      ? prisma.course.findMany({
          where: listedCourses({
            OR: [
              { title: like },
              { subtitle: like },
              { university: { is: { name: like } } },
            ],
          }),
          select: courseSelect,
          orderBy: [{ featured: 'desc' }, { rating: 'desc' }, { reviews: 'desc' }],
          take: take.courses,
        })
      : [],
    take.universities > 0
      ? prisma.university.findMany({
          where: listedUniversities({
            OR: [
              { name: like },
              { shortName: like },
              { city: like },
              { state: like },
            ],
          }),
          select: universitySelect,
          orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
          take: take.universities,
        })
      : [],
    take.products > 0
      ? prisma.product.findMany({
          where: liveProducts({
            OR: [
              { title: like },
              { subtitle: like },
              { author: like },
              { brand: like },
            ],
          }),
          select: productSelect,
          orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
          take: take.products,
        })
      : [],
  ])

  const exams = take.exams > 0 ? searchExams(q, take.exams) : []

  return {
    q,
    courses,
    universities,
    products,
    exams,
    total: courses.length + universities.length + products.length + exams.length,
  }
}
