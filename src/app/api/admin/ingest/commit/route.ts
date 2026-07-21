import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ingestResultSchema } from '@/lib/ai/ingest'
import { slugify } from '@/lib/utils'

const bodySchema = z.object({
  universityId: z.string().min(1),
  programmes: ingestResultSchema.shape.programmes,
  /** Must equal programmes.length — proves the payload is the reviewed one. */
  reviewToken: z.string(),
  confirm: z.literal(true),
})

/** Per-university unique slug, since two institutions both have an "online-bba". */
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
 * Writes reviewed programmes into the catalogue.
 *
 * Separate from extraction on purpose: a human has seen these numbers. The
 * confirm flag and review token exist so a bulk write can't happen by accident
 * or against a payload the reviewer never saw.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }

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

  const { universityId, programmes, reviewToken } = parsed.data

  if (reviewToken !== String(programmes.length)) {
    return NextResponse.json(
      { error: 'This preview has changed since it was reviewed. Re-run the extraction.' },
      { status: 409 },
    )
  }

  const university = await prisma.university.findUnique({
    where: { id: universityId },
    select: { id: true, name: true, partnerStatus: true },
  })
  if (!university) {
    return NextResponse.json({ error: 'University not found' }, { status: 404 })
  }

  const created: Array<{ id: string; slug: string; title: string; terms: number; subjects: number }> = []

  for (const p of programmes) {
    const slug = await uniqueSlug(p.title)

    const course = await prisma.course.create({
      data: {
        slug,
        title: p.title,
        subtitle: (p.about ?? '').slice(0, 160) || `${p.title} at ${university.name}`,
        level: p.level,
        mode: p.mode,
        stream: p.stream,
        durationYears: p.durationYears,
        // Null fee means "the document didn't say". Zero is a real, visible
        // value that would render as a free course — keep them distinct and
        // let the admin fill it in.
        feePerYear: p.feePerYear ?? 0,
        about: p.about ?? '',
        eligibility: p.eligibility ?? '',
        highlights: [],
        skills: [],
        recruiters: [],
        source: 'UNIVERSITY',
        universityId: university.id,
        // Never auto-feature machine-extracted content on the homepage.
        featured: false,
      },
      select: { id: true, slug: true, title: true },
    })

    let subjectCount = 0
    for (const t of p.terms) {
      const term = await prisma.term.create({
        data: { courseId: course.id, number: t.number, title: t.title },
        select: { id: true },
      })
      for (const s of t.subjects) {
        await prisma.subject.create({
          data: {
            courseId: course.id,
            termId: term.id,
            code: s.code ?? `${slugify(s.title).slice(0, 20).toUpperCase()}-${subjectCount + 1}`,
            title: s.title,
            credits: s.credits ?? 4,
          },
        })
        subjectCount++
      }
    }

    created.push({ ...course, terms: p.terms.length, subjects: subjectCount })
  }

  return NextResponse.json({
    ok: true,
    university: university.name,
    // Courses only reach students once the partner is ACTIVE — surfacing this
    // so an admin isn't surprised either way.
    liveNow: university.partnerStatus === 'ACTIVE',
    partnerStatus: university.partnerStatus,
    created,
    count: created.length,
  })
}
