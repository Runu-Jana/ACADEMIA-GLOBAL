import { prisma } from '@/lib/prisma'
import { listedCourseWhere } from '@/lib/visibility'
import { asList } from '@/lib/utils'
import type { CourseCardData } from '@/components/course/course-card'

/**
 * Learning paths — curated, ordered tracks of existing courses toward one career
 * outcome (the Coursera Specialization analog). This is a discovery layer: a path
 * groups and sequences courses, but each course is still enrolled and paid for on
 * its own page. Unlisted/unpublished courses are filtered out at query time so a
 * path never links to something a student cannot actually open.
 */

const stepCourseSelect = {
  id: true, slug: true, title: true, mode: true, stream: true, level: true,
  durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
  rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
  university: { select: { name: true, shortName: true, slug: true } },
} as const

export type PathStep = { order: number; course: CourseCardData }

export type LearningPathSummary = {
  slug: string
  title: string
  subtitle: string
  outcome: string
  stream: string
  skills: string[]
  featured: boolean
  courseCount: number
  totalYears: number
  levels: string[]
}

export type LearningPathDetail = LearningPathSummary & {
  about: string
  steps: PathStep[]
}

/** Distinct course levels in the order they first appear along the track. */
function levelsInOrder(steps: { course: { level: string } }[]): string[] {
  const seen: string[] = []
  for (const s of steps) if (!seen.includes(s.course.level)) seen.push(s.course.level)
  return seen
}

/** Every published path, featured first, with a light per-path summary. */
export async function getLearningPaths(): Promise<LearningPathSummary[]> {
  const paths = await prisma.learningPath.findMany({
    where: { published: true },
    orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
    select: {
      slug: true, title: true, subtitle: true, outcome: true, stream: true,
      skills: true, featured: true,
      courses: {
        where: { course: listedCourseWhere },
        orderBy: { order: 'asc' },
        select: { course: { select: { durationYears: true, level: true } } },
      },
    },
  })

  return paths.map((p) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    outcome: p.outcome,
    stream: p.stream,
    skills: asList(p.skills),
    featured: p.featured,
    courseCount: p.courses.length,
    totalYears: Math.round(p.courses.reduce((sum, c) => sum + c.course.durationYears, 0) * 10) / 10,
    levels: levelsInOrder(p.courses),
  }))
}

/** One path with its ordered, enrollable course steps, or null if not found. */
export async function getLearningPath(slug: string): Promise<LearningPathDetail | null> {
  const path = await prisma.learningPath.findFirst({
    where: { slug, published: true },
    select: {
      slug: true, title: true, subtitle: true, about: true, outcome: true,
      stream: true, skills: true, featured: true,
      courses: {
        where: { course: listedCourseWhere },
        orderBy: { order: 'asc' },
        select: { order: true, course: { select: stepCourseSelect } },
      },
    },
  })
  if (!path) return null

  const steps: PathStep[] = path.courses.map((c) => ({ order: c.order, course: c.course }))

  return {
    slug: path.slug,
    title: path.title,
    subtitle: path.subtitle,
    about: path.about,
    outcome: path.outcome,
    stream: path.stream,
    skills: asList(path.skills),
    featured: path.featured,
    steps,
    courseCount: steps.length,
    totalYears: Math.round(steps.reduce((sum, s) => sum + s.course.durationYears, 0) * 10) / 10,
    levels: levelsInOrder(steps),
  }
}

/** Slugs of every published path — for generateStaticParams / sitemap. */
export async function getLearningPathSlugs(): Promise<string[]> {
  const paths = await prisma.learningPath.findMany({
    where: { published: true },
    select: { slug: true },
  })
  return paths.map((p) => p.slug)
}
