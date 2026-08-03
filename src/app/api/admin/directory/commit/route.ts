import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, badRequest, zodMessage, notFound, readJson } from '../../_lib/guard'
import { ingestResultSchema } from '@/lib/ai/ingest'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  university: z
    .object({
      id: z.string().trim().optional(),
      name: z.string().trim().max(120).optional(),
      city: z.string().trim().max(60).optional(),
      state: z.string().trim().max(60).optional(),
      sourceUrl: z.string().trim().max(300).optional(),
    })
    .refine((u) => u.id || (u.name && u.name.trim().length >= 2), {
      message: 'Choose an existing directory university or name a new one.',
    }),
  programmes: ingestResultSchema.shape.programmes,
  reviewToken: z.string(),
  confirm: z.literal(true),
})

async function uniqueSlug(kind: 'course' | 'university', base: string): Promise<string> {
  const b = slugify(base).slice(0, kind === 'course' ? 90 : 70) || kind
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? b : `${b}-${n + 1}`
    const clash =
      kind === 'course'
        ? await prisma.course.findUnique({ where: { slug }, select: { id: true } })
        : await prisma.university.findUnique({ where: { slug }, select: { id: true } })
    if (!clash) return slug
  }
  return `${b}-${Date.now()}`
}

/**
 * Publishes reviewed programmes as DIRECTORY courses under a directory (non-
 * partner) university, creating that university if it's new. Separate from
 * extraction on purpose: a human has seen these numbers, and DIRECTORY courses
 * are display-only — applying to one raises a lead, never an enrolment.
 */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = bodySchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const { university: input, programmes, reviewToken } = parsed.data
  if (reviewToken !== String(programmes.length)) {
    return NextResponse.json(
      { error: 'This preview has changed since it was reviewed. Re-run the extraction.' },
      { status: 409 },
    )
  }

  // Resolve (or create) the target directory university.
  let university: { id: string; name: string; slug: string }
  if (input.id) {
    const existing = await prisma.university.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, slug: true, partnerStatus: true, listed: true },
    })
    if (!existing) return notFound('That university no longer exists.')
    if (existing.partnerStatus === 'ACTIVE') {
      return badRequest(
        'That is an active partner — scraped courses can only be added to a directory (non-partner) listing.',
      )
    }
    if (!existing.listed) {
      await prisma.university.update({ where: { id: existing.id }, data: { listed: true } })
    }
    university = existing
  } else {
    const name = input.name!.trim()
    const slug = await uniqueSlug('university', name)
    university = await prisma.university.create({
      data: {
        slug,
        name,
        shortName: (name.split(/\s+/)[0] ?? name).slice(0, 24),
        about: `${name} — a directory listing on Academia Global, compiled from public information. Academia Global is not affiliated with this institution.`,
        estYear: new Date().getFullYear(),
        approvals: [],
        city: input.city?.trim() || 'India',
        state: input.state?.trim() || '',
        sourceUrl: input.sourceUrl ?? null,
        partnerStatus: 'PROSPECT',
        listed: true,
        featured: false,
        rating: 4.2,
      },
      select: { id: true, name: true, slug: true },
    })
  }

  const created: { id: string; slug: string; title: string }[] = []
  for (const p of programmes) {
    const slug = await uniqueSlug('course', `${university.slug}-${p.title}`)
    const course = await prisma.course.create({
      data: {
        slug,
        title: p.title,
        subtitle: (p.about ?? '').slice(0, 160) || `${p.title} at ${university.name}`,
        level: p.level,
        mode: p.mode,
        stream: p.stream,
        durationYears: p.durationYears,
        feePerYear: p.feePerYear ?? 0,
        about: p.about ?? '',
        eligibility: p.eligibility ?? '',
        highlights: [],
        skills: [],
        recruiters: [],
        source: 'DIRECTORY',
        universityId: university.id,
        reviewStatus: 'PUBLISHED', // irrelevant for DIRECTORY, kept tidy
        featured: false,
      },
      select: { id: true, slug: true, title: true },
    })

    for (const t of p.terms) {
      const term = await prisma.term.create({
        data: { courseId: course.id, number: t.number, title: t.title },
        select: { id: true },
      })
      let i = 0
      for (const s of t.subjects) {
        await prisma.subject.create({
          data: {
            courseId: course.id,
            termId: term.id,
            code: s.code ?? `${slugify(s.title).slice(0, 20).toUpperCase()}-${i + 1}`,
            title: s.title,
            credits: s.credits ?? 4,
          },
        })
        i++
      }
    }
    created.push(course)
  }

  return NextResponse.json({
    ok: true,
    university: { name: university.name, slug: university.slug },
    count: created.length,
  })
}
