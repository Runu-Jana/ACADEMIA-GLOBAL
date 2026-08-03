import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { liveCourses } from '@/lib/visibility'
import { enforceRateLimit, MINUTE } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Captures a prospective student — typically raised when someone shows interest
 * in a DIRECTORY (non-partner) listing. We snapshot what they were looking at
 * (so the lead reads well later) and pick a matching ACTIVE partner to steer
 * them toward. Counsellors take it from there in /admin/leads.
 *
 * Deliberately open to anonymous visitors: a lead we can call back is worth more
 * than forcing a sign-up first.
 */
const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,17}$/, 'Enter a valid phone number'),
  message: z.string().trim().max(1000).optional(),
  source: z.enum(['directory', 'callback', 'counsellor', 'brochure']).default('directory'),
  interestedUniversityId: z.string().trim().max(40).optional(),
  interestedCourseId: z.string().trim().max(40).optional(),
})

export async function POST(req: Request) {
  // Anonymous and DB-writing — cap it so the lead table can't be flooded.
  const limited = enforceRateLimit(req, 'lead', 8, 10 * MINUTE)
  if (limited) return limited

  const user = await getCurrentUser() // optional

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Please check the details entered.' },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Snapshot what they were interested in, and find a partner alternative.
  let interestedUniversityName: string | null = null
  let interestedCourseTitle: string | null = null
  let interestedUniversityId = data.interestedUniversityId ?? null
  let suggestedUniversityId: string | null = null

  if (data.interestedCourseId) {
    const course = await prisma.course.findUnique({
      where: { id: data.interestedCourseId },
      select: {
        title: true,
        stream: true,
        level: true,
        universityId: true,
        university: { select: { name: true } },
      },
    })
    if (course) {
      interestedCourseTitle = course.title
      interestedUniversityName = course.university.name
      interestedUniversityId = interestedUniversityId ?? course.universityId
      const alt = await prisma.course.findFirst({
        where: liveCourses({ stream: course.stream, level: course.level }),
        orderBy: [{ rating: 'desc' }, { reviews: 'desc' }],
        select: { universityId: true },
      })
      suggestedUniversityId = alt?.universityId ?? null
    }
  } else if (interestedUniversityId) {
    const uni = await prisma.university.findUnique({
      where: { id: interestedUniversityId },
      select: { name: true },
    })
    interestedUniversityName = uni?.name ?? null
  }

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message || null,
      source: data.source,
      userId: user?.id ?? null,
      interestedUniversityId,
      interestedUniversityName,
      interestedCourseId: data.interestedCourseId ?? null,
      interestedCourseTitle,
      suggestedUniversityId,
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, leadId: lead.id })
}
