import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { isFeatureConfigured } from '@/lib/ai'
import { generateSop, mapAiDocError } from '@/lib/ai/career-kit'
import { loadStudentContext } from '@/lib/ai/student-context'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const schema = z.object({
  programme: z.string().trim().min(2, 'Which programme are you applying to?').max(160),
  institution: z.string().trim().max(160).optional(),
  background: z.string().trim().min(10, 'Add a little about your background').max(3000),
  motivation: z.string().trim().min(10, 'Tell us why you want this').max(2000),
  goals: z.string().trim().max(1500).optional(),
})

/** Real background + motivation → an editable Statement of Purpose draft. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })

  if (!isFeatureConfigured('sop')) {
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
    const doc = await generateSop(parsed.data, student, { userId: user.id })
    return NextResponse.json({ ok: true, doc })
  } catch (err) {
    const { status, error } = mapAiDocError(err)
    return NextResponse.json({ error }, { status })
  }
}
