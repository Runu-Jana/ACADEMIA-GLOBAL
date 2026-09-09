import { z } from 'zod'
import { runAi } from './index'
import { normalizeCode } from '@/lib/promotions'

/**
 * The AI campaign assistant for Promotions.
 *
 * An operator writes a plain-language brief ("Diwali sale on exam books, about
 * 15% off, this week") and the model drafts the marketing side of a coupon: a
 * memorable code, a title, a description, a sensible discount, and ready-to-use
 * banner + email copy. Nothing is saved — the draft pre-fills the promotion form
 * for a human to review, adjust and publish. The deterministic engine still
 * decides the actual discount at redemption; the AI only proposes.
 */

export type PromoScope = 'SHOP' | 'COURSE' | 'ALL'

export interface PromotionBrief {
  brief: string
  scope: PromoScope
}

export interface PromotionSuggestion {
  code: string
  title: string
  description: string
  type: 'PERCENT' | 'FLAT'
  /** Percent (1–100) when type is PERCENT; rupees when FLAT. */
  value: number
  minSubtotalRupees: number | null
  maxDiscountRupees: number | null
  banner: string
  emailSubject: string
  emailBody: string
  rationale: string
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'title', 'description', 'type', 'value', 'banner', 'emailSubject', 'emailBody', 'rationale'],
  properties: {
    code: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    type: { type: 'string', enum: ['PERCENT', 'FLAT'] },
    value: { type: 'number' },
    minSubtotalRupees: { type: ['number', 'null'] },
    maxDiscountRupees: { type: ['number', 'null'] },
    banner: { type: 'string' },
    emailSubject: { type: 'string' },
    emailBody: { type: 'string' },
    rationale: { type: 'string' },
  },
} as const

const rawSuggestion = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string().default(''),
  type: z.enum(['PERCENT', 'FLAT']),
  value: z.number(),
  minSubtotalRupees: z.number().nullable().optional(),
  maxDiscountRupees: z.number().nullable().optional(),
  banner: z.string().default(''),
  emailSubject: z.string().default(''),
  emailBody: z.string().default(''),
  rationale: z.string().default(''),
})

const SCOPE_LABEL: Record<PromoScope, string> = {
  SHOP: 'the student shop (books & stationery)',
  COURSE: 'course tuition fees',
  ALL: 'the shop and course fees',
}

function clean(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

export async function generatePromotionCampaign(
  input: PromotionBrief,
  ctx: { userId?: string | null } = {},
): Promise<PromotionSuggestion> {
  const system = `You are a growth marketer for Shiksha Sarthi, an Indian education platform. From the operator's brief, draft ONE promotional coupon. Guidelines:
- Suggest a short, memorable, upper-case code (letters/digits, e.g. DIWALI25) that reflects the campaign.
- Keep discounts commercially sensible: percentage offers are usually 5–30%; flat offers a round rupee amount. Never propose more than 50% off.
- Use "type": "PERCENT" with "value" as the percentage (1–100), OR "type": "FLAT" with "value" as the discount in RUPEES.
- Optionally set minSubtotalRupees (a minimum order) and, for a percentage, maxDiscountRupees (a cap) — in RUPEES, or null.
- Write a one-line banner and a short marketing email (subject + 2–4 sentence body). Warm, credible, India-appropriate; never invent false claims or fake scarcity.
- "rationale": one line on why you chose this discount.
This coupon applies to ${SCOPE_LABEL[input.scope]}. Return only JSON matching the schema.`

  const content = `Campaign brief:\n"""\n${input.brief.trim()}\n"""\n\nDraft the promotion as JSON.`

  const res = await runAi(
    'promotion',
    { system, schema: SCHEMA as unknown as Record<string, unknown>, maxTokens: 800, messages: [{ role: 'user', content }] },
    ctx,
  )

  const raw = rawSuggestion.parse(JSON.parse(res.text))
  const isPercent = raw.type === 'PERCENT'
  const value = isPercent
    ? Math.max(1, Math.min(100, Math.round(raw.value)))
    : Math.max(0, Math.round(raw.value))

  return {
    code: normalizeCode(raw.code).slice(0, 40) || 'SAVE',
    title: raw.title.trim().slice(0, 120),
    description: raw.description.trim().slice(0, 500),
    type: raw.type,
    value,
    minSubtotalRupees: clean(raw.minSubtotalRupees),
    maxDiscountRupees: isPercent ? clean(raw.maxDiscountRupees) : null,
    banner: raw.banner.trim(),
    emailSubject: raw.emailSubject.trim(),
    emailBody: raw.emailBody.trim(),
    rationale: raw.rationale.trim(),
  }
}

/** Maps a generation failure to a friendly message + HTTP status for the route. */
export function mapPromotionError(err: unknown): { status: number; error: string } {
  const message = err instanceof Error ? err.message : 'Could not draft the promotion. Please try again.'
  if (/not configured|api key|no provider/i.test(message)) {
    return { status: 503, error: 'The AI assistant is not configured yet. Add an AI API key to enable it.' }
  }
  if (message.toLowerCase().includes('usage limit')) return { status: 429, error: message }
  if (/json|parse|validation|expected|token/i.test(message)) {
    return { status: 502, error: 'The draft came back in an unexpected format. Please try again.' }
  }
  return { status: 502, error: message }
}
