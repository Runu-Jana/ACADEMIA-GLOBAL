import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { generateCareerPaths, mapAiDocError } from '@/lib/ai/career-kit'
import { loadStudentContext } from '@/lib/ai/student-context'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const schema = z.object({
  interests: z.string().trim().min(3, 'Tell us what you enjoy or are curious about').max(1500),
  strengths: z.string().trim().max(1000).optional(),
  constraints: z.string().trim().max(1000).optional(),
})

/** Interests + the student's real study record → 3-4 grounded career directions. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })

  if (!isFeatureConfigured('career')) {
    return NextResponse.json(
      { error: 'This tool is not configured on this environment. Add an API key to enable it.', code: 'ai_unconfigured' },
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
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Please check the details entered.' }, { status: 400 })
  }

  try {
    const student = await loadStudentContext(user.id, user.name)
    const doc = await generateCareerPaths(parsed.data, student, { userId: user.id })
    return NextResponse.json({ ok: true, doc })
  } catch (err) {
    const { status, error } = mapAiDocError(err)
    return NextResponse.json({ error }, { status })
  }
}
