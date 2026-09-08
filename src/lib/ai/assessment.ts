import { z } from 'zod'
import { runAi } from './index'

/**
 * AI question generation for the test authoring screen.
 *
 * An admin points this at a test, and the model drafts multiple-choice
 * questions from that test's own course/module material. Nothing it produces is
 * saved automatically — the route hands the drafts back for a human to review,
 * fix and select, because a graded assessment with a wrong answer key is worse
 * than no assessment at all.
 *
 * The output is constrained by a JSON schema, but schema-valid is not the same
 * as sane: the model can still return three options, or a correctIndex past the
 * end of the list. So every draft is re-validated our side and the bad ones are
 * dropped rather than allowed to poison the batch.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed'

export interface AssessmentInput {
  /** How many questions to attempt. The route clamps this before we see it. */
  count: number
  difficulty: Difficulty
  /** Optional topic to bias the questions toward, e.g. "Newton's laws". */
  focus?: string
  /** Assembled course / module / lesson text the questions must be grounded in. */
  source: string
  /** Human label for the prompt, e.g. "Physics 101 · Kinematics". */
  contextLabel: string
}

/** One reviewed, ready-to-save draft. Marks are the admin's call, not the model's. */
export interface QuestionDraft {
  text: string
  options: string[]
  correctIndex: number
  explanation: string | null
}

/** JSON Schema handed to the model — four options, one correct, a short why. */
const GEN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'options', 'correctIndex'],
        properties: {
          text: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctIndex: { type: 'integer' },
          explanation: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const

// Re-validated our side — schema-constrained output is still model output.
const rawQuestion = z.object({
  text: z.string(),
  options: z.array(z.string()).default([]),
  correctIndex: z.number(),
  explanation: z.string().nullable().optional(),
})
const rawResult = z.object({ questions: z.array(rawQuestion).default([]) })

type RawQuestion = z.infer<typeof rawQuestion>

const DIFFICULTY_NOTE: Record<Difficulty, string> = {
  easy: 'Keep them straightforward — recall and single-step understanding.',
  medium: 'Aim for solid exam-level difficulty — application, not just recall.',
  hard: 'Make them challenging — multi-step reasoning and common traps.',
  mixed: 'Vary the difficulty across the set, from recall to multi-step reasoning.',
}

/**
 * Turns each raw draft into a clean question or discards it.
 *
 * Trims everything, drops blank options, de-duplicates them (a repeated option
 * is a broken MCQ), and keeps the question only if the model's correct answer
 * survives that cleanup — re-pointing correctIndex at the surviving option so a
 * dropped blank above it can't shift the answer key.
 */
export function normalizeDrafts(raw: RawQuestion[]): QuestionDraft[] {
  const out: QuestionDraft[] = []

  for (const q of raw) {
    const text = q.text.trim()
    if (!text) continue

    const correctText = q.options[q.correctIndex]?.trim()

    const seen = new Set<string>()
    const options: string[] = []
    for (const opt of q.options) {
      const o = opt.trim()
      if (!o || seen.has(o.toLowerCase())) continue
      seen.add(o.toLowerCase())
      options.push(o)
    }
    if (options.length < 2 || options.length > 6) continue

    // Re-locate the correct answer after cleanup; drop if it didn't survive.
    const correctIndex = correctText ? options.findIndex((o) => o === correctText) : -1
    if (correctIndex < 0) continue

    out.push({
      text,
      options,
      correctIndex,
      explanation: q.explanation?.trim() || null,
    })
  }

  return out
}

/**
 * Drafts questions from the supplied material. Returns validated drafts only —
 * an empty array means nothing usable came back, which the route surfaces.
 */
export async function generateAssessment(
  input: AssessmentInput,
  ctx: { userId?: string | null } = {},
): Promise<QuestionDraft[]> {
  const count = Math.max(1, Math.min(12, Math.round(input.count)))

  const system = `You are an exam setter for an Indian education platform. Write
clear, unambiguous multiple-choice questions grounded in the study material you are
given. Rules:
- Exactly four options per question unless the content demands otherwise; never fewer than three.
- Exactly one option is correct. The distractors must be plausible to someone who half-knows the topic, not obviously wrong or joke answers.
- Base the questions on the supplied material. Where the material is thin, you may draw on standard knowledge of the same subject, but never invent facts that contradict it.
- No "All of the above" / "None of the above" unless it is genuinely the best-formed question.
- Each question carries a one-line explanation of why the correct option is right.
- ${DIFFICULTY_NOTE[input.difficulty]}
Return JSON matching the schema: a "questions" array, each with text, options, correctIndex (0-based), and explanation.`

  const focusLine = input.focus?.trim()
    ? `Focus the questions on: ${input.focus.trim()}\n\n`
    : ''

  const content = `Write ${count} multiple-choice question${count === 1 ? '' : 's'} for this assessment.
Context: ${input.contextLabel}

${focusLine}Study material to draw from:
"""
${input.source.trim() || '(no lesson text was provided — use standard knowledge of the topic named in the context above)'}
"""

Produce the questions as JSON matching the schema.`

  // Output is the bill on every model here, so size the cap to the ask rather
  // than paying for the route default's ceiling on a three-question request.
  const maxTokens = Math.min(3000, 500 + count * 190)

  const res = await runAi(
    'assessment',
    { system, schema: GEN_SCHEMA as unknown as Record<string, unknown>, maxTokens, messages: [{ role: 'user', content }] },
    ctx,
  )

  return normalizeDrafts(rawResult.parse(JSON.parse(res.text)).questions)
}

/** Maps a generation failure to a friendly message + HTTP status for the route. */
export function mapAssessmentError(err: unknown): { status: number; error: string } {
  const message =
    err instanceof Error ? err.message : 'Could not generate questions. Please try again.'
  if (message.toLowerCase().includes('usage limit')) return { status: 429, error: message }
  if (/json|parse|validation|expected|token/i.test(message)) {
    return { status: 502, error: 'The questions came back in an unexpected format. Please try again.' }
  }
  return { status: 502, error: message }
}
