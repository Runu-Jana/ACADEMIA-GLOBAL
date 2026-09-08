import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** The ids of every course the signed-in student has saved — hydrates the hearts. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  const rows = await prisma.savedCourse.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  })
  return NextResponse.json({ courseIds: rows.map((r) => r.courseId) })
}

const schema = z.object({ courseId: z.string().trim().min(1) })

/** Toggles a course in the student's saved list; returns the resulting state. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { courseId } = parsed.data

  const existing = await prisma.savedCourse.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  })
  if (existing) {
    await prisma.savedCourse.delete({ where: { id: existing.id } })
    return NextResponse.json({ saved: false })
  }

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  try {
    await prisma.savedCourse.create({ data: { userId: user.id, courseId } })
  } catch {
    // Raced with another tab that saved first — the end state is still "saved".
  }
  return NextResponse.json({ saved: true })
}
