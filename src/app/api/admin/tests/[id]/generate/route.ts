import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isFeatureConfigured } from '@/lib/ai'
import { generateAssessment, mapAssessmentError } from '@/lib/ai/assessment'
import { requireAdminApi, zodMessage, badRequest, notFound, readJson } from '../../../_lib/guard'

export const dynamic = 'force-dynamic'

const schema = z.object({
  count: z.coerce.number().int().min(1).max(12),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  focus: z.string().trim().max(200).optional().or(z.literal('')),
})

/** Keeps the prompt (and the bill) bounded when a module carries long lessons. */
const MAX_SOURCE_CHARS = 12000

/**
 * Drafts multiple-choice questions for a test from its own course material.
 *
 * Read-only: it returns candidates for the admin to review and save, and never
 * writes a Question itself. Saving happens through the bulk endpoint once a
 * human has vetted the answer keys.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const { id: testId } = await params
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))
  const { count, difficulty, focus } = parsed.data

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      title: true,
      module: {
        select: {
          title: true,
          description: true,
          course: { select: { title: true, about: true } },
          lessons: {
            orderBy: { order: 'asc' },
            select: { title: true, description: true, body: true },
          },
        },
      },
    },
  })
  if (!test) return notFound('That test no longer exists.')

  if (!isFeatureConfigured('assessment')) {
    return NextResponse.json(
      { error: 'AI question generation is not configured yet. Add an AI API key to enable it.' },
      { status: 503 },
    )
  }

  const { module: mod } = test
  const contextLabel = [mod.course.title, mod.title].filter(Boolean).join(' · ')

  // Assemble the grounding material, richest-signal first, then truncate.
  const parts: string[] = []
  if (mod.course.about) parts.push(`Course overview: ${mod.course.about}`)
  if (mod.description) parts.push(`Module: ${mod.title} — ${mod.description}`)
  for (const lesson of mod.lessons) {
    const bodyText = lesson.body?.trim() || lesson.description?.trim()
    if (bodyText) parts.push(`Lesson — ${lesson.title}:\n${bodyText}`)
    else parts.push(`Lesson — ${lesson.title}`)
  }
  const source = parts.join('\n\n').slice(0, MAX_SOURCE_CHARS)

  try {
    const questions = await generateAssessment(
      { count, difficulty, focus: focus || undefined, source, contextLabel },
      { userId: user.id },
    )
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No usable questions came back. Try again, or add a focus topic.' },
        { status: 502 },
      )
    }
    return NextResponse.json({ questions })
  } catch (err) {
    const { status, error } = mapAssessmentError(err)
    return NextResponse.json({ error }, { status })
  }
}
