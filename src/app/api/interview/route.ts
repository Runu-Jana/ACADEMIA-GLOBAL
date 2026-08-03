import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { generateInterviewPrep, mapAiDocError } from '@/lib/ai/career-kit'
import { loadStudentContext } from '@/lib/ai/student-context'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const schema = z.object({
  target: z.string().trim().min(2, 'What role or programme are you interviewing for?').max(160),
  kind: z.enum(['job', 'admission']).default('job'),
  background: z.string().trim().max(2000).optional(),
})

/** A target role/programme → likely questions and honest angles to answer them. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })

  if (!isFeatureConfigured('interview')) {
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
    const doc = await generateInterviewPrep(parsed.data, student, { userId: user.id })
    return NextResponse.json({ ok: true, doc })
  } catch (err) {
    const { status, error } = mapAiDocError(err)
    return NextResponse.json({ error }, { status })
  }
}
