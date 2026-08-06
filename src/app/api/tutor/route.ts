import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { streamAi, isFeatureConfigured, type AiMessage } from '@/lib/ai'
import { retrieve, type RetrievedChunk } from '@/lib/ai/retrieval'
import { captureError } from '@/lib/observability'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The course-aware AI tutor.
 *
 * Every answer is grounded in passages retrieved from the one course the
 * student is enrolled in, and the model is told to answer from those passages
 * or admit it can't. That constraint is the product: a tutor that quietly
 * invents a submission deadline or an exam weightage does more harm than no
 * tutor at all.
 */

const schema = z.object({
  courseId: z.string().trim().min(1, 'Course is required'),
  message: z
    .string()
    .trim()
    .min(1, 'Type a question first')
    .max(1000, 'That question is a bit long — try splitting it up'),
  /** Optional: the lesson the student is looking at, used only to steer retrieval. */
  lessonHint: z.string().trim().max(200).optional(),
})

/** How much prior conversation to replay for continuity. Kept short: it's
 *  billed on every turn, and a tutor rarely needs more than the last exchange. */
const HISTORY_TURNS = 8
const MAX_CHUNK_CHARS = 1200
const MAX_CONTEXT_CHARS = 6000

/** Only the enrolled student (or an admin, for testing) may open a course's tutor. */
async function canAccess(userId: string, role: string, courseId: string): Promise<boolean> {
  if (role === 'ADMIN') return true
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  })
  return Boolean(enrollment)
}

interface BuiltContext {
  block: string
  sources: { n: number; label: string; type: string }[]
  /** True when nothing matched and we fell back to general course context. */
  weak: boolean
}

function buildContext(chunks: RetrievedChunk[]): BuiltContext {
  const sources: BuiltContext['sources'] = []
  const parts: string[] = []
  let budget = MAX_CONTEXT_CHARS

  for (const c of chunks) {
    if (budget <= 0) break
    const text = c.text.slice(0, Math.min(MAX_CHUNK_CHARS, budget))
    budget -= text.length
    const n = sources.length + 1
    sources.push({ n, label: c.sourceLabel, type: c.sourceType })
    parts.push(`[${n}] (${c.sourceLabel})\n${text}`)
  }

  return {
    block: parts.join('\n\n'),
    sources,
    weak: chunks.length > 0 && chunks.every((c) => c.score === 0),
  }
}

function systemPrompt(course: { title: string; university: string }, ctx: BuiltContext): string {
  const guardForContext = !ctx.block
    ? `This course has no indexed material yet. Tell the student that, and suggest they check the Study Material tab or ask their instructor. Do not answer the question from general knowledge.`
    : ctx.weak
      ? `No passage directly matched the question. The context below is general information about the course. If it does not answer the question, say you could not find it in this course's materials — do not fill the gap with a guess.`
      : `Answer using the numbered context below, and cite what you use inline as [1], [2] matching the source numbers.`

  return `You are the AI study tutor for the online programme "${course.title}" offered by ${course.university} on Shiksha Sarthi, an Indian learning platform.

You are helping ONE enrolled student understand THIS course. Follow these rules strictly:

- The numbered course context is your single source of truth about this course. ${guardForContext}
- Never invent course specifics — fees, dates, deadlines, marks, attendance rules, or "what's on the exam". If the context doesn't state it, say so plainly.
- You MAY use general academic knowledge to explain a concept the context introduces (define a term, work an example), but make clear when you are explaining generally versus stating a course fact.
- Be concise, warm and encouraging. Prefer short paragraphs or bullet points — the student is often on a phone.
- Use Indian conventions: currency is the rupee (₹).
- If asked to do something outside tutoring this course (write their assignment for them to submit as their own, answer an unrelated question), gently redirect.

Course context:
${ctx.block || '(none — this course has not been indexed yet)'}`
}

async function loadHistory(userId: string, courseId: string): Promise<AiMessage[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { userId, courseId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_TURNS,
    select: { role: true, content: true },
  })
  return rows
    .reverse()
    .map((r) => ({ role: r.role === 'assistant' ? 'assistant' : 'user', content: r.content }))
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }
  const { courseId, message, lessonHint } = parsed.data

  if (!(await canAccess(user.id, user.role, courseId))) {
    return NextResponse.json({ error: 'Enrol in this course to use its tutor.' }, { status: 403 })
  }

  // Fail before we commit to a streaming response — headers can't carry an
  // error once the body has started flowing.
  if (!isFeatureConfigured('tutor')) {
    return NextResponse.json(
      {
        error:
          'The AI tutor is not configured on this environment. Add an ANTHROPIC_API_KEY to enable it.',
        code: 'ai_unconfigured',
      },
      { status: 503 },
    )
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true, university: { select: { name: true } } },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Retrieval is steered by the question plus, if provided, the lesson in view.
  const query = lessonHint ? `${lessonHint}\n${message}` : message
  const chunks = await retrieve(courseId, query, 6, { userId: user.id })
  const context = buildContext(chunks)

  const system = systemPrompt({ title: course.title, university: course.university.name }, context)
  const history = await loadHistory(user.id, courseId)
  const messages: AiMessage[] = [...history, { role: 'user', content: message }]

  let stream: Awaited<ReturnType<typeof streamAi>>
  try {
    stream = await streamAi('tutor', { system, messages }, { userId: user.id, courseId })
  } catch (err) {
    // Rate-limit or provider init failure — both surface here, before streaming.
    const msg = err instanceof Error ? err.message : 'The tutor is unavailable right now.'
    const rateLimited = msg.toLowerCase().includes('usage limit')
    return NextResponse.json({ error: msg }, { status: rateLimited ? 429 : 503 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = ''
      try {
        for await (const delta of stream.textStream) {
          full += delta
          controller.enqueue(encoder.encode(delta))
        }
        await stream.final() // writes the metering row
        controller.close()
      } catch (err) {
        // The student has already seen partial text; close cleanly rather than
        // erroring the stream, and skip persistence of a truncated answer.
        captureError(err, { scope: 'ai/tutor', phase: 'stream', courseId })
        try {
          controller.close()
        } catch {
          /* already closed */
        }
        return
      }

      // Persist the exchange only once it completed, so a reload resumes a real
      // thread. +1ms keeps the pair ordered when both land in the same tick.
      if (full.trim()) {
        const now = Date.now()
        try {
          await prisma.$transaction([
            prisma.chatMessage.create({
              data: { userId: user.id, courseId, role: 'user', content: message, createdAt: new Date(now) },
            }),
            prisma.chatMessage.create({
              data: { userId: user.id, courseId, role: 'assistant', content: full, createdAt: new Date(now + 1) },
            }),
          ])
        } catch (err) {
          // A dropped thread write isn't worth failing a delivered answer, but
          // it shouldn't vanish silently either.
          captureError(err, { scope: 'ai/tutor', phase: 'persist', courseId })
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      // Sources are known before streaming, so they ride along in a header the
      // client reads once, up front, to render citations under the answer.
      'X-Tutor-Sources': encodeURIComponent(JSON.stringify(context.sources)),
      'X-Tutor-Weak': context.weak ? '1' : '0',
    },
  })
}

/** The saved tutor thread for this course, plus whether the feature is live. */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const courseId = new URL(req.url).searchParams.get('courseId')?.trim()
  if (!courseId) return NextResponse.json({ error: 'courseId is required' }, { status: 400 })

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id, courseId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true },
  })

  return NextResponse.json({ messages, configured: isFeatureConfigured('tutor') })
}

/** Clears this course's tutor thread for the signed-in student. */
export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const courseId = new URL(req.url).searchParams.get('courseId')?.trim()
  if (!courseId) return NextResponse.json({ error: 'courseId is required' }, { status: 400 })

  const { count } = await prisma.chatMessage.deleteMany({ where: { userId: user.id, courseId } })
  return NextResponse.json({ ok: true, cleared: count })
}
