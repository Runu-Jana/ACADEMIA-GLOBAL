import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { listedCourses } from '@/lib/visibility'
import { STREAMS } from '@/lib/constants'
import type { CourseCardData } from '@/components/course/course-card'

/**
 * "Recommended for you" — personalized course suggestions.
 *
 * Built from signals the student already generates: the courses they've enrolled
 * in, saved to their wishlist, and applied to. Those reveal an affinity for
 * particular streams, levels, delivery modes and universities; candidate courses
 * (that they don't already have) are scored by how well they match, with small
 * boosts for rating and featured status. No search history is stored, so it isn't
 * used. A student with no signals yet gets popular programmes instead.
 *
 * Deliberately a transparent heuristic, not a black box: it runs with zero
 * latency and no API key, and an AI reranker can be layered on later by scoring
 * this shortlist rather than the whole catalogue.
 */

/** CourseCardData fields plus universityId/featured, which scoring needs but the card doesn't. */
const cardSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  universityId: true, featured: true,
  university: { select: { name: true, shortName: true, slug: true } },
} satisfies Prisma.CourseSelect

const signalSelect = {
  id: true, title: true, stream: true, level: true, mode: true, universityId: true,
} satisfies Prisma.CourseSelect

type Candidate = Prisma.CourseGetPayload<{ select: typeof cardSelect }>

export type Recommendation = {
  courses: CourseCardData[]
  /** One-line explanation shown under the section heading. */
  basis: string
}

const streamLabel = (v: string) => STREAMS.find((s) => s.value === v)?.label ?? v

/** Drop the scoring-only fields so the shape is exactly CourseCardData. */
function toCard(c: Candidate): CourseCardData {
  const { universityId: _u, featured: _f, ...card } = c
  void _u
  void _f
  return card
}

export async function recommendCourses(userId: string, limit = 6): Promise<Recommendation> {
  const [enrolled, saved, applied] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId }, select: { course: { select: signalSelect } } }),
    prisma.savedCourse.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { course: { select: signalSelect } },
    }),
    prisma.application.findMany({ where: { userId }, select: { course: { select: signalSelect } } }),
  ])

  // Saving/applying is a stronger intent signal than an enrolment that may be long finished.
  const signals = [
    ...enrolled.map((e) => ({ c: e.course, w: 2 })),
    ...saved.map((s) => ({ c: s.course, w: 3 })),
    ...applied.map((a) => ({ c: a.course, w: 3 })),
  ]
  const excluded = new Set(signals.map((s) => s.c.id))

  const stream = new Map<string, number>()
  const level = new Map<string, number>()
  const mode = new Map<string, number>()
  const uni = new Map<string, number>()
  const bump = (m: Map<string, number>, k: string | null, w: number) => {
    if (k) m.set(k, (m.get(k) ?? 0) + w)
  }
  for (const { c, w } of signals) {
    bump(stream, c.stream, w)
    bump(level, c.level, w)
    bump(mode, c.mode, w)
    bump(uni, c.universityId, w)
  }

  const coldStart = signals.length === 0

  const candidates = await prisma.course.findMany({
    where: listedCourses(excluded.size ? { id: { notIn: [...excluded] } } : {}),
    select: cardSelect,
    orderBy: [{ featured: 'desc' }, { rating: 'desc' }, { reviews: 'desc' }],
    // Cold start needs no scoring; otherwise pull a bounded pool to rank in memory.
    take: coldStart ? limit : 80,
  })

  if (coldStart) {
    return { courses: candidates.map(toCard), basis: 'Popular programmes right now' }
  }

  const scored = candidates
    .map((c) => ({
      c,
      score:
        5 * (stream.get(c.stream) ?? 0) +
        2 * (level.get(c.level) ?? 0) +
        1.5 * (mode.get(c.mode) ?? 0) +
        3 * (uni.get(c.universityId) ?? 0) +
        c.rating * 0.6 +
        (c.featured ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.c.rating - a.c.rating || b.c.reviews - a.c.reviews)

  const courses = scored.slice(0, limit).map((x) => toCard(x.c))

  const topStream = [...stream.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const firstSaved = saved[0]?.course.title
  const basis = firstSaved
    ? `Because you saved “${firstSaved}”`
    : topStream
      ? `More in ${streamLabel(topStream)}, based on your courses`
      : 'Based on your learning activity'

  return { courses, basis }
}
