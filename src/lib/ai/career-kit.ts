import { z } from 'zod'
import { runAi } from './index'
import type { AiFeature } from './types'

/**
 * The AI Career Kit — four student-facing tools that all speak one shape.
 *
 * Career paths, a skill roadmap, an SOP draft and interview prep are different
 * asks, but every one of them is really "a titled document made of sections".
 * Rather than four bespoke schemas and four renderers, they share one `AiDoc`
 * contract: a title, an optional intro, a list of sections (each a heading with
 * prose and/or bullets and/or labelled groups) and a closing note. One schema,
 * one <CareerDoc> renderer, four prompts.
 *
 * The honesty rule from the resume/ingest tools carries over: the model works
 * from the student's real record and what they typed — it must not invent an
 * employer, a grade, a deadline or a credential. Guidance may be aspirational;
 * facts may not be fabricated.
 */

// --------------------------------------------------------------- shared shape

/** JSON Schema handed to the model. Kept deliberately small and flat. */
export const DOC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'sections'],
  properties: {
    title: { type: 'string' },
    intro: { type: ['string', 'null'] },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading'],
        properties: {
          heading: { type: 'string' },
          body: { type: ['string', 'null'] },
          bullets: { type: 'array', items: { type: 'string' } },
          groups: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'items'],
              properties: {
                label: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    note: { type: ['string', 'null'] },
  },
} as const

// Re-validated our side — schema-constrained output is still model output.
const groupSchema = z.object({ label: z.string(), items: z.array(z.string()).default([]) })
const sectionSchema = z.object({
  heading: z.string(),
  body: z.string().nullable().optional(),
  bullets: z.array(z.string()).default([]),
  groups: z.array(groupSchema).default([]),
})
export const docSchema = z.object({
  title: z.string(),
  intro: z.string().nullable().optional(),
  sections: z.array(sectionSchema).default([]),
  note: z.string().nullable().optional(),
})
export type AiDoc = z.infer<typeof docSchema>

/** Real, verifiable bits of the student's Shiksha Sarthi record. */
export interface StudentContext {
  name: string
  courses: string[]
  streams: string[]
  certificates: string[]
}

function contextBlock(ctx: StudentContext): string {
  return `Student name: ${ctx.name}
Programmes on Shiksha Sarthi: ${ctx.courses.join(', ') || '(none yet)'}
Streams studied: ${ctx.streams.join(', ') || '(none)'}
Certificates earned (real, verifiable): ${ctx.certificates.join(', ') || '(none)'}`
}

const HONESTY = `Ground everything in the student's real record and what they told you.
You may suggest directions, skills and steps that are aspirational, but you must
NOT state as fact any employer, salary, grade, deadline, credential or experience
they did not provide. When you have little to go on, say so plainly rather than
inventing detail.`

/** The one call every tool goes through; returns a validated AiDoc. */
async function runDoc(
  feature: AiFeature,
  system: string,
  content: string,
  ctx: { userId?: string | null },
  maxTokens: number,
): Promise<AiDoc> {
  const res = await runAi(
    feature,
    { system, schema: DOC_SCHEMA as unknown as Record<string, unknown>, maxTokens, messages: [{ role: 'user', content }] },
    ctx,
  )
  return docSchema.parse(JSON.parse(res.text))
}

// ----------------------------------------------------------- career paths

export interface CareerInput {
  interests: string
  strengths?: string
  constraints?: string
}

export async function generateCareerPaths(
  input: CareerInput,
  student: StudentContext,
  ctx: { userId?: string | null } = {},
): Promise<AiDoc> {
  const system = `You are a pragmatic career counsellor for students in India.
Given a student's interests and their study record, propose 3-4 realistic career
directions. For each, explain in one or two lines why it fits them, then give the
kinds of roles it leads to and concrete first steps they can take now (courses to
finish, skills to build, a project to attempt). Favour paths that build on what
they are already studying. Use Indian context (roles, typical employers, ₹ where
useful) but never invent a specific salary figure as fact.

${HONESTY}

Return an AiDoc: title = a short encouraging heading; each career direction is one
section (heading = the direction, body = why it fits, then a "Roles" group and a
"Start here" group of first steps); note = one honest line on how to choose.`

  const content = `${contextBlock(student)}

Interests / what they enjoy: ${input.interests.trim() || '(not specified)'}
Strengths / subjects they're good at: ${input.strengths?.trim() || '(not specified)'}
Constraints (location, time, budget): ${input.constraints?.trim() || '(none stated)'}

Produce the career directions as JSON matching the schema.`

  return runDoc('career', system, content, ctx, 1000)
}

// --------------------------------------------------------------- roadmap

export interface RoadmapInput {
  goal: string
  timeframe?: string
  startingPoint?: string
}

export async function generateRoadmap(
  input: RoadmapInput,
  student: StudentContext,
  ctx: { userId?: string | null } = {},
): Promise<AiDoc> {
  const system = `You are a skills mentor who builds clear, phased learning roadmaps
for students in India. Given a goal, break the journey into 3-5 ordered phases.
Each phase has a short title, a rough duration, what to focus on, and a couple of
concrete milestones that prove the phase is done (a project, a certificate, a
portfolio piece). Build on the programmes the student is already taking where you
can. Keep it doable for a self-driven learner.

${HONESTY}

Return an AiDoc: title = the goal restated as a roadmap heading; intro = one line
setting expectations; each phase is a section (heading = "Phase N — <title> (<duration>)",
a "Focus on" group and a "Milestones" group); note = one line on staying consistent.`

  const content = `${contextBlock(student)}

Goal: ${input.goal.trim()}
Timeframe they have: ${input.timeframe?.trim() || '(not specified)'}
Where they're starting from: ${input.startingPoint?.trim() || '(not specified)'}

Produce the phased roadmap as JSON matching the schema.`

  return runDoc('roadmap', system, content, ctx, 1200)
}

// ------------------------------------------------------------------- sop

export interface SopInput {
  programme: string
  institution?: string
  background: string
  motivation: string
  goals?: string
}

export async function generateSop(
  input: SopInput,
  student: StudentContext,
  ctx: { userId?: string | null } = {},
): Promise<AiDoc> {
  const system = `You are an admissions writing coach. Draft a Statement of Purpose
for a student in India applying to a programme. Write in the student's own voice —
first person, sincere, specific, not flowery. Use only their real background,
motivation and record; do not invent achievements, marks or experiences. Structure
the SOP as a few titled paragraphs so it's easy to edit.

${HONESTY}

Return an AiDoc: title = "Statement of Purpose"; intro = a one-line note that this
is a draft to personalise; sections = the SOP paragraphs, each with a short heading
("Opening", "Academic background", "Why this programme", "Goals", "Closing") and the
paragraph text in body; note = one honest reminder to add specifics only they know.`

  const content = `${contextBlock(student)}

Applying to programme: ${input.programme.trim()}
Institution: ${input.institution?.trim() || '(not specified)'}
Their background (in their words): ${input.background.trim()}
Why they want this / motivation: ${input.motivation.trim()}
Career goals afterwards: ${input.goals?.trim() || '(not specified)'}

Produce the Statement of Purpose as JSON matching the schema.`

  return runDoc('sop', system, content, ctx, 1400)
}

// ------------------------------------------------------------- interview

export interface InterviewInput {
  target: string
  kind: 'job' | 'admission'
  background?: string
}

export async function generateInterviewPrep(
  input: InterviewInput,
  student: StudentContext,
  ctx: { userId?: string | null } = {},
): Promise<AiDoc> {
  const forWhat =
    input.kind === 'admission' ? 'an admissions interview' : 'a job interview'
  const system = `You are an interview coach for students in India preparing for
${forWhat}. Produce 6-8 likely questions for their target. For each question,
explain in one line what the interviewer is really assessing, and give 2-3 bullet
points the student could build their own honest answer around — angles and STAR-style
prompts, NOT a fabricated script claiming things they haven't done. Finish with a
short list of general tips.

${HONESTY}

Return an AiDoc: title = a heading naming the target; each question is a section
(heading = the question, body = what it assesses, bullets = angles for their answer);
add a final section titled "Tips" with bullets; note = one line of encouragement.`

  const content = `${contextBlock(student)}

Preparing for: ${input.target.trim()} (${forWhat})
Relevant background they mention: ${input.background?.trim() || '(none beyond their record above)'}

Produce the interview preparation as JSON matching the schema.`

  return runDoc('interview', system, content, ctx, 1200)
}

// -------------------------------------------------------------- error map

/** Maps a generation error to a friendly message + HTTP status for the routes. */
export function mapAiDocError(err: unknown): { status: number; error: string } {
  const message = err instanceof Error ? err.message : 'Could not generate this. Please try again.'
  if (message.toLowerCase().includes('usage limit')) return { status: 429, error: message }
  if (/json|parse|validation|expected/i.test(message)) {
    return { status: 502, error: 'The result came back in an unexpected format. Please try again.' }
  }
  return { status: 502, error: message }
}
