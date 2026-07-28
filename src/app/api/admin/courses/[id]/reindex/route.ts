import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, notFound } from '../../../_lib/guard'
import { indexCourse } from '@/lib/ai/retrieval'

export const dynamic = 'force-dynamic'
// Embedding a whole course's text can take a while on a large catalogue entry.
export const maxDuration = 120

/**
 * Rebuilds the AI tutor's retrieval index for one course.
 *
 * Content edits don't reindex themselves — an admin triggers this after
 * changing a course's modules, lessons or materials so the tutor answers from
 * the current syllabus rather than a stale snapshot.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id } = await params
  const course = await prisma.course.findUnique({ where: { id }, select: { id: true } })
  if (!course) return notFound('That course no longer exists.')

  const result = await indexCourse(id)
  return NextResponse.json({ ok: true, ...result })
}
