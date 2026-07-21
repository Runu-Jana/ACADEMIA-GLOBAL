import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/* -------------------------------------------------------------------------- */
/* Drafts are saved after every step, so each field is optional while the       */
/* wizard is in flight and only checked properly on the final submit.           */
/* -------------------------------------------------------------------------- */

const personalSchema = z
  .object({
    fullName: z.string().trim().max(80),
    email: z.string().trim().max(120),
    mobile: z.string().trim().max(20),
    dob: z.string().trim().max(20),
    gender: z.string().trim().max(30),
    address: z.string().trim().max(200),
    city: z.string().trim().max(60),
    state: z.string().trim().max(60),
    pincode: z.string().trim().max(10),
  })
  .partial()

const programSchema = z
  .object({
    intake: z.string().trim().max(40),
    specialisation: z.string().trim().max(90),
    emi: z.boolean(),
  })
  .partial()

const educationSchema = z
  .object({
    qualification: z.string().trim().max(90),
    board: z.string().trim().max(120),
    institute: z.string().trim().max(120),
    yearOfPassing: z.string().trim().max(10),
    percentage: z.string().trim().max(10),
    program: programSchema,
  })
  .partial()

const schema = z.object({
  courseId: z.string().trim().min(1, 'Course is required'),
  step: z.number().int().min(1).max(4).optional(),
  personal: personalSchema.optional(),
  education: educationSchema.optional(),
  submit: z.boolean().optional(),
})

/** Everything that must be present before an application can be submitted. */
const requiredOnSubmit: { key: string; from: 'personal' | 'education'; label: string }[] = [
  { key: 'fullName', from: 'personal', label: 'Full name' },
  { key: 'email', from: 'personal', label: 'Email address' },
  { key: 'mobile', from: 'personal', label: 'Mobile number' },
  { key: 'qualification', from: 'education', label: 'Highest qualification' },
  { key: 'institute', from: 'education', label: 'School / college name' },
  { key: 'yearOfPassing', from: 'education', label: 'Year of passing' },
]

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

/**
 * Saves or submits the admission application for a course. Upserts on
 * (userId, courseId) so the wizard can call it once per step without
 * creating duplicates.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
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
      { error: parsed.error.errors[0]?.message ?? 'Invalid details' },
      { status: 400 },
    )
  }

  const { courseId, step, personal, education, submit } = parsed.data
  const userId = session.userId

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, slug: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const existing = await prisma.application.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, personal: true, education: true, step: true, status: true },
  })

  // Merge over the saved draft so a step that only sends its own slice of the
  // form never wipes the answers captured on an earlier step.
  const mergedPersonal = { ...asRecord(existing?.personal), ...(personal ?? {}) }
  const mergedEducation = { ...asRecord(existing?.education), ...(education ?? {}) }

  if (submit) {
    const missing = requiredOnSubmit.filter(({ key, from }) => {
      const source: Record<string, unknown> =
        from === 'personal' ? mergedPersonal : mergedEducation
      const value = source[key]
      return typeof value !== 'string' || value.trim() === ''
    })
    if (missing.length) {
      return NextResponse.json(
        { error: `Please complete: ${missing.map((m) => m.label).join(', ')}` },
        { status: 400 },
      )
    }
  }

  const nextStep = submit ? 4 : Math.max(step ?? 1, existing?.step ?? 1)
  const status = submit ? 'SUBMITTED' : (existing?.status ?? 'DRAFT')

  const application = await prisma.application.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      step: nextStep,
      status,
      personal: mergedPersonal as Prisma.InputJsonObject,
      education: mergedEducation as Prisma.InputJsonObject,
    },
    update: {
      step: nextStep,
      status,
      personal: mergedPersonal as Prisma.InputJsonObject,
      education: mergedEducation as Prisma.InputJsonObject,
    },
    select: { id: true, step: true, status: true, updatedAt: true },
  })

  return NextResponse.json({ ok: true, application, courseSlug: course.slug })
}
