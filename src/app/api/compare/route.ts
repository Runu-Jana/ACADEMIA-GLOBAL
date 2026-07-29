import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { asList } from '@/lib/utils'
import { liveCourses } from '@/lib/visibility'

/**
 * Feeds the `/compare` page. The shortlist lives in localStorage, so the ids
 * only exist in the browser and the comparison has to be fetched rather than
 * server-rendered.
 *
 * GET /api/compare?ids=a,b,c
 */

// Mirrors MAX_COMPARE in `@/lib/use-compare`, redeclared here because that
// module is client-only and its exports can't be read on the server.
const MAX_IDS = 4

export type CompareCourse = {
  id: string
  slug: string
  title: string
  subtitle: string
  level: string
  mode: string
  stream: string
  durationYears: number
  feePerYear: number
  originalFee: number | null
  discountPct: number
  rating: number
  reviews: number
  isUgcEntitled: boolean
  hasPlacement: boolean
  hasLiveClass: boolean
  examMode: string
  skills: string[]
  university: { name: string; shortName: string; slug: string }
}

export async function GET(request: NextRequest) {
  const ids = Array.from(
    new Set(
      (request.nextUrl.searchParams.get('ids') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_IDS)

  if (ids.length === 0) {
    return NextResponse.json({ courses: [] satisfies CompareCourse[] })
  }

  const rows = await prisma.course.findMany({
    // Gated: a shortlisted course that's since been unpublished or belongs to a
    // non-active partner simply drops out of the comparison.
    where: liveCourses({ id: { in: ids } }),
    select: {
      id: true, slug: true, title: true, subtitle: true, level: true, mode: true, stream: true,
      durationYears: true, feePerYear: true, originalFee: true, discountPct: true,
      rating: true, reviews: true, isUgcEntitled: true, hasPlacement: true, hasLiveClass: true,
      examMode: true, skills: true,
      university: { select: { name: true, shortName: true, slug: true } },
    },
  })

  // Return them in the order the user shortlisted them, not the DB's order.
  const byId = new Map(rows.map((row) => [row.id, row]))
  const courses: CompareCourse[] = ids.flatMap((id) => {
    const row = byId.get(id)
    return row ? [{ ...row, skills: asList(row.skills) }] : []
  })

  return NextResponse.json({ courses })
}
