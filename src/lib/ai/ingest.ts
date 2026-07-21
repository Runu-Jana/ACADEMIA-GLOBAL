import { z } from 'zod'
import { runAi } from './index'
import { COURSE_LEVELS, COURSE_MODES, STREAMS } from '@/lib/constants'

/**
 * Prospectus → structured programme data.
 *
 * Onboarding a partner university currently means typing dozens of programmes,
 * semesters, subjects and fee tables into the admin panel by hand. This turns
 * that into: upload the PDF, review, approve.
 *
 * THE RULE THIS FILE IS BUILT AROUND: the model must never invent a value it
 * didn't read. These are real institutions' fees and eligibility criteria —
 * publishing a hallucinated fee for a named university is a
 * misrepresentation problem, not a data-quality one. So every uncertain field
 * is nullable, every programme carries a confidence rating, and nothing
 * reaches the catalogue without a human approving it.
 */

const LEVELS = COURSE_LEVELS.map((l) => l.value)
const MODES = COURSE_MODES.map((m) => m.value)
const STREAM_VALUES = STREAMS.map((s) => s.value)

/** JSON Schema handed to the model. Mirrors the Prisma shape it will become. */
export const INGEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['programmes'],
  properties: {
    programmes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'level', 'mode', 'stream', 'durationYears', 'confidence'],
        properties: {
          title: { type: 'string' },
          level: { type: 'string', enum: LEVELS },
          mode: { type: 'string', enum: MODES },
          stream: { type: 'string', enum: STREAM_VALUES },
          durationYears: { type: 'number' },
          // Nullable on purpose — "not stated in the document" must be
          // representable, or the model will pick a plausible number.
          feePerYear: { type: ['integer', 'null'] },
          eligibility: { type: ['string', 'null'] },
          about: { type: ['string', 'null'] },
          terms: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['number', 'title'],
              properties: {
                number: { type: 'integer' },
                title: { type: 'string' },
                subjects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['title'],
                    properties: {
                      code: { type: ['string', 'null'] },
                      title: { type: 'string' },
                      credits: { type: ['integer', 'null'] },
                    },
                  },
                },
              },
            },
          },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const

// Parsed shape — validated again on our side, because a schema-constrained
// response is still model output.
const subjectSchema = z.object({
  code: z.string().nullable().optional(),
  title: z.string().min(1),
  credits: z.number().int().min(0).max(40).nullable().optional(),
})

const termSchema = z.object({
  number: z.number().int().min(1).max(20),
  title: z.string().min(1),
  subjects: z.array(subjectSchema).default([]),
})

const programmeSchema = z.object({
  title: z.string().min(2),
  level: z.enum(LEVELS as [string, ...string[]]),
  mode: z.enum(MODES as [string, ...string[]]),
  stream: z.enum(STREAM_VALUES as [string, ...string[]]),
  durationYears: z.number().min(0.5).max(10),
  feePerYear: z.number().int().min(0).nullable().optional(),
  eligibility: z.string().nullable().optional(),
  about: z.string().nullable().optional(),
  terms: z.array(termSchema).default([]),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string().nullable().optional(),
})

export const ingestResultSchema = z.object({ programmes: z.array(programmeSchema) })
export type IngestedProgramme = z.infer<typeof programmeSchema>
export type IngestResult = z.infer<typeof ingestResultSchema>

const SYSTEM = `You extract academic programme data from university prospectuses for an education marketplace.

ABSOLUTE RULE — never invent a value.
If the document does not state a fee, eligibility rule, subject code or credit
count, return null for that field. A plausible-looking guess is worse than a
null here: these are real institutions, and a fabricated fee published under
their name is a legal problem for the operator. Nulls get filled in by a human;
invented numbers get published.

Rules:
- Extract only programmes actually described in the document. Do not add
  programmes you would expect an institution like this to offer.
- durationYears: use the stated duration in years (a 6-month certificate is 0.5).
- feePerYear: annual fee in whole rupees. If only a total programme fee is
  given, divide by duration and say so in notes. If no fee appears, use null.
- terms: semesters or years. Include subjects with their codes and credits
  where the document lists them. If it only names the programme without a
  syllabus breakdown, return an empty terms array.
- confidence: "high" when the document states the details plainly;
  "medium" when you inferred structure from partial information;
  "low" when the source is ambiguous, scanned badly, or contradictory.
- notes: anything a human reviewer should check — assumptions you made,
  contradictions in the source, values you deliberately left null.

Mark aggressively rather than optimistically. A reviewer skimming 40 extracted
programmes relies on confidence and notes to know where to look.`

/**
 * Runs extraction over prospectus text.
 *
 * Long documents are split so each call sees a coherent slice — a 200-page
 * prospectus won't fit usefully in one prompt, and quality degrades long
 * before the context limit does.
 */
export async function extractProgrammes(
  text: string,
  ctx: { userId?: string | null } = {},
): Promise<{ result: IngestResult; chunks: number; warnings: string[] }> {
  const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
  if (clean.length < 200) {
    throw new Error('That document has too little readable text to extract from.')
  }

  const CHUNK = 12_000
  const chunks: string[] = []
  for (let i = 0; i < clean.length; i += CHUNK) chunks.push(clean.slice(i, i + CHUNK))

  const warnings: string[] = []
  const programmes: IngestedProgramme[] = []

  for (const [i, chunk] of chunks.entries()) {
    const res = await runAi(
      'notes', // routed to the cheap tier; this is extraction, not prose
      {
        system: SYSTEM,
        schema: INGEST_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 8000, // structured output needs room; overrides the route cap
        messages: [
          {
            role: 'user',
            content: `Prospectus text (part ${i + 1} of ${chunks.length}):\n\n${chunk}`,
          },
        ],
      },
      ctx,
    )

    try {
      const parsed = ingestResultSchema.parse(JSON.parse(res.text))
      programmes.push(...parsed.programmes)
    } catch {
      warnings.push(`Part ${i + 1} of ${chunks.length} could not be parsed and was skipped.`)
    }
  }

  // The same programme often appears in a contents page and again in detail.
  // Keep the richer copy.
  const byTitle = new Map<string, IngestedProgramme>()
  for (const p of programmes) {
    const key = p.title.toLowerCase().replace(/\s+/g, ' ').trim()
    const existing = byTitle.get(key)
    const richer =
      !existing ||
      p.terms.length > existing.terms.length ||
      (p.feePerYear != null && existing.feePerYear == null)
    if (richer) byTitle.set(key, p)
  }

  const deduped = [...byTitle.values()]
  const lowConfidence = deduped.filter((p) => p.confidence === 'low').length
  if (lowConfidence) {
    warnings.push(`${lowConfidence} programme(s) came back low-confidence — review these closely.`)
  }
  const noFee = deduped.filter((p) => p.feePerYear == null).length
  if (noFee) {
    warnings.push(`${noFee} programme(s) have no fee in the source. Add fees before publishing.`)
  }

  return { result: { programmes: deduped }, chunks: chunks.length, warnings }
}

/**
 * Extracts text from an uploaded PDF.
 *
 * pdf-parse v2 exposes a class, not the v1 default function — and it wants a
 * Uint8Array rather than a Node Buffer. Imported dynamically so the parser
 * (and its pdf.js dependency) stays out of the bundle for every request that
 * isn't an ingestion.
 */
export async function pdfToText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const { text } = await parser.getText()
    return text ?? ''
  } finally {
    // Releases the worker; skipping this leaks across repeated ingestions.
    await parser.destroy()
  }
}
