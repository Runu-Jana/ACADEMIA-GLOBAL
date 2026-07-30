import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { generateResume } from '@/lib/ai/resume'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const schema = z.object({
  targetRole: z.string().trim().min(2, 'Tell us the role you are targeting').max(120),
  about: z.string().trim().max(1500).optional(),
  education: z.string().trim().max(2500).optional(),
  experience: z.string().trim().max(3000).optional(),
  projects: z.string().trim().max(2500).optional(),
  skills: z.string().trim().max(1200).optional(),
  achievements: z.string().trim().max(1500).optional(),
})

/**
 * Turns a student's rough notes plus their real platform record into a polished
 * resume. Enrolment history and earned certificates come from the database so
 * they're accurate and verifiable; everything else comes from the form. The
 * model is told never to invent — see src/lib/ai/resume.ts.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })

  if (!isFeatureConfigured('resume')) {
    return NextResponse.json(
      {
        error:
          'The AI resume builder is not configured on this environment. Add an ANTHROPIC_API_KEY to enable it.',
        code: 'ai_unconfigured',
      },
      { status: 503 },
    )
  }

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

  // Pull the verifiable bits from our own records.
  const [certs, enrollments] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
      select: {
        grade: true,
        issuedAt: true,
        course: { select: { title: true, university: { select: { name: true } } } },
      },
    }),
    prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { course: { select: { title: true } } },
    }),
  ])

  try {
    const resume = await generateResume(
      {
        name: user.name,
        targetRole: parsed.data.targetRole,
        about: parsed.data.about,
        education: parsed.data.education,
        experience: parsed.data.experience,
        projects: parsed.data.projects,
        skills: parsed.data.skills,
        achievements: parsed.data.achievements,
        platformCertificates: certs.map((c) => ({
          name: c.course.title,
          issuer: c.course.university.name,
          grade: c.grade,
          date: formatDate(c.issuedAt),
        })),
        courses: enrollments.map((e) => e.course.title),
      },
      { userId: user.id },
    )
    return NextResponse.json({ ok: true, resume })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not generate the resume.'
    const rateLimited = message.toLowerCase().includes('usage limit')
    // A JSON/validation failure is a transient model hiccup — ask them to retry.
    const friendly = rateLimited
      ? message
      : /json|parse|validation|expected/i.test(message)
        ? 'The resume came back in an unexpected format. Please try generating again.'
        : message
    return NextResponse.json({ error: friendly }, { status: rateLimited ? 429 : 502 })
  }
}
