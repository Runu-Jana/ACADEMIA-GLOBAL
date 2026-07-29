import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActivePartnerApi } from '../../_lib/guard'
import { ingestResultSchema } from '@/lib/ai/ingest'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  programmes: ingestResultSchema.shape.programmes,
  /** Must equal programmes.length — proves the payload is the reviewed one. */
  reviewToken: z.string(),
  confirm: z.literal(true),
})

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 70) || 'programme'
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? base : `${base}-${n + 1}`
    const clash = await prisma.course.findUnique({ where: { slug }, select: { id: true } })
    if (!clash) return slug
  }
  return `${base}-${Date.now()}`
}

/**
 * Writes reviewed, AI-extracted programmes into the partner's catalogue as
 * DRAFTS.
 *
 * Always drafts, never live: the partner still has to submit each one, and an
 * operator still has to approve it. The university is forced to the partner's
 * own — the payload can't retarget another institution.
 */
export async function POST(req: Request) {
  const { user, universityId, response } = await requireActivePartnerApi()
  if (!user) return response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid payload' },
      { status: 400 },
    )
  }

  const { programmes, reviewToken } = parsed.data
  if (reviewToken !== String(programmes.length)) {
    return NextResponse.json(
      { error: 'This preview has changed since it was reviewed. Re-run the extraction.' },
      { status: 409 },
    )
  }

  const created: { id: string; title: string }[] = []

  for (const p of programmes) {
    const slug = await uniqueSlug(p.title)
    const course = await prisma.course.create({
      data: {
        slug,
        title: p.title,
        subtitle: (p.about ?? '').slice(0, 160) || p.title,
        level: p.level,
        mode: p.mode,
        stream: p.stream,
        durationYears: p.durationYears,
        // Null fee means "the document didn't say" — leave it 0 for the partner
        // to fill before submitting rather than inventing a number.
        feePerYear: p.feePerYear ?? 0,
        about: p.about ?? '',
        eligibility: p.eligibility ?? '',
        highlights: [],
        skills: [],
        recruiters: [],
        source: 'UNIVERSITY',
        universityId,
        featured: false,
        reviewStatus: 'DRAFT',
        submittedById: user.id,
      },
      select: { id: true, title: true },
    })

    // Bring across any semester/subject structure the model found. Subject codes
    // must be unique within a course (schema constraint), so de-dupe as we go —
    // the model can repeat or omit a code without breaking the write.
    const usedCodes = new Set<string>()
    let subjectCount = 0
    for (const t of p.terms) {
      const term = await prisma.term.create({
        data: { courseId: course.id, number: t.number, title: t.title },
        select: { id: true },
      })
      for (const s of t.subjects) {
        subjectCount++
        const raw = s.code ?? `${slugify(s.title).slice(0, 18).toUpperCase() || 'SUB'}-${subjectCount}`
        let code = raw
        for (let k = 1; usedCodes.has(code); k++) code = `${raw}-${k}`
        usedCodes.add(code)
        await prisma.subject.create({
          data: { courseId: course.id, termId: term.id, code, title: s.title, credits: s.credits ?? 4 },
        })
      }
    }

    created.push(course)
  }

  return NextResponse.json({ ok: true, created, count: created.length })
}
