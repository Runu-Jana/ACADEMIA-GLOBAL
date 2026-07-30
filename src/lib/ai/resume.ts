import { z } from 'zod'
import { runAi } from './index'

/**
 * Student profile → polished, structured resume.
 *
 * THE RULE THIS FILE IS BUILT AROUND (same as ingest): never invent a fact. The
 * model may rephrase, reorder and strengthen what the candidate actually gave —
 * it may NOT add an employer, a degree, a date, a number or a skill they didn't
 * mention. A fabricated resume gets a real student rejected in an interview or
 * fired after one, so honesty is the whole product here.
 *
 * The student's Academia Global certificates are passed in and are real and
 * verifiable, so those the model is told to include as-is.
 */

/** JSON Schema handed to the model for structured output. */
export const RESUME_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headline',
    'summary',
    'skills',
    'experience',
    'education',
    'projects',
    'certifications',
    'achievements',
  ],
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['role', 'organisation', 'bullets'],
        properties: {
          role: { type: 'string' },
          organisation: { type: 'string' },
          period: { type: ['string', 'null'] },
          bullets: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['qualification', 'institution'],
        properties: {
          qualification: { type: 'string' },
          institution: { type: 'string' },
          period: { type: ['string', 'null'] },
          detail: { type: ['string', 'null'] },
        },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'detail'],
        properties: { name: { type: 'string' }, detail: { type: 'string' } },
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string' },
          issuer: { type: ['string', 'null'] },
          detail: { type: ['string', 'null'] },
        },
      },
    },
    achievements: { type: 'array', items: { type: 'string' } },
  },
} as const

// Re-validated on our side, because schema-constrained output is still model output.
const experienceSchema = z.object({
  role: z.string(),
  organisation: z.string(),
  period: z.string().nullable().optional(),
  bullets: z.array(z.string()).default([]),
})
const educationEntrySchema = z.object({
  qualification: z.string(),
  institution: z.string(),
  period: z.string().nullable().optional(),
  detail: z.string().nullable().optional(),
})
const projectSchema = z.object({ name: z.string(), detail: z.string() })
const certSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable().optional(),
  detail: z.string().nullable().optional(),
})

export const resumeSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  projects: z.array(projectSchema).default([]),
  certifications: z.array(certSchema).default([]),
  achievements: z.array(z.string()).default([]),
})
export type ResumeContent = z.infer<typeof resumeSchema>

export interface ResumeInput {
  name: string
  targetRole: string
  about?: string
  education?: string
  experience?: string
  projects?: string
  skills?: string
  achievements?: string
  /** Real, verifiable Academia Global certificates — the model includes these. */
  platformCertificates: { name: string; issuer: string; grade: string; date: string }[]
  courses: string[]
}

const SYSTEM = `You are an expert resume writer for students and early-career candidates in India.

ABSOLUTE RULE — never invent a fact.
Rephrase, reorder and strengthen only what the candidate actually gave you. Do
NOT add employers, job titles, degrees, institutions, dates, numbers or skills
they did not mention. A fabricated resume gets a real person rejected in an
interview or fired afterwards. When a section has no real input, return an empty
array rather than padding it.

Rules:
- headline: a short professional title aligned to the target role.
- summary: 2-3 crisp sentences positioning the candidate for the target role,
  drawn only from their real background.
- experience / projects: turn rough notes into concise, achievement-oriented
  bullet points that start with strong action verbs. Quantify ONLY with numbers
  the candidate actually provided — never invent metrics.
- skills: a clean, de-duplicated list. You may group or tidy, not invent.
- certifications: include every Academia Global certificate listed in the input
  exactly (these are real and independently verifiable), plus any the candidate
  mentioned themselves.
- Use Indian conventions (₹, Indian institutions). Keep it truthful, concise and
  ATS-friendly.`

/**
 * Generates the polished resume. Throws on rate-limit / provider errors (the
 * route maps them) and on a malformed model response (validation failure).
 */
export async function generateResume(
  input: ResumeInput,
  ctx: { userId?: string | null } = {},
): Promise<ResumeContent> {
  const certs = input.platformCertificates.length
    ? input.platformCertificates
        .map((c) => `- ${c.name} (${c.issuer}), grade ${c.grade}, ${c.date}`)
        .join('\n')
    : '(none)'

  const content = `Target role: ${input.targetRole}
Candidate name: ${input.name}

About / summary (rough notes): ${input.about?.trim() || '(none)'}
Prior education: ${input.education?.trim() || '(none)'}
Experience / internships: ${input.experience?.trim() || '(none)'}
Projects: ${input.projects?.trim() || '(none)'}
Skills the candidate listed: ${input.skills?.trim() || '(none)'}
Achievements: ${input.achievements?.trim() || '(none)'}

Academia Global certificates earned (REAL and verifiable — include under certifications):
${certs}

Programmes taken on Academia Global: ${input.courses.join(', ') || '(none)'}

Produce the polished resume as JSON matching the schema.`

  const res = await runAi(
    'resume',
    {
      system: SYSTEM,
      schema: RESUME_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 1600, // a full resume needs more room than the routing default
      messages: [{ role: 'user', content }],
    },
    ctx,
  )

  return resumeSchema.parse(JSON.parse(res.text))
}
