/**
 * Provider-agnostic AI contract.
 *
 * Every feature talks to this interface, never to a vendor SDK directly, so
 * switching or mixing providers is a config change rather than a rewrite.
 * That matters here: this platform runs for years, model pricing moves
 * constantly, and being locked to one vendor is a liability nobody will pay
 * to fix later.
 */

export type AiFeature =
  | 'tutor'
  | 'chatbot'
  | 'resume'
  | 'sop'
  | 'career'
  | 'interview'
  | 'notes'
  | 'roadmap'
  | 'purpose'
  | 'assessment'

export type AiEffort = 'low' | 'medium' | 'high'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiRequest {
  /**
   * Stable prefix — system prompt plus any retrieved course context.
   * Providers cache this, so keep volatile content (timestamps, the user's
   * current question) out of it or every request pays full price.
   */
  system?: string
  messages: AiMessage[]
  maxTokens?: number
  effort?: AiEffort
  /** JSON Schema for structured output. */
  schema?: Record<string, unknown>
}

export interface AiUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export interface AiResult {
  text: string
  usage: AiUsage
  model: string
  provider: string
  latencyMs: number
}

export interface AiStream {
  textStream: AsyncIterable<string>
  /** Resolves once the stream completes, with full usage for metering. */
  final: () => Promise<AiResult>
}

export interface AiProvider {
  readonly name: string
  complete(model: string, req: AiRequest): Promise<AiResult>
  stream(model: string, req: AiRequest): Promise<AiStream>
}

// ---------------------------------------------------------------- pricing

/** USD per million tokens. Cache read ≈ 0.1× input; cache write ≈ 1.25×. */
export const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-opus-4-8': { input: 5.0, output: 25.0 },
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  // OpenAI
  'gpt-5.6-sol': { input: 5.0, output: 30.0 },
  'gpt-5.6-terra': { input: 2.5, output: 15.0 },
  'gpt-5.6-luna': { input: 1.0, output: 6.0 },
  'gpt-5.4-nano': { input: 0.2, output: 1.25 },
  // Embeddings — input-only; output stays 0 so costPaise bills tokens once.
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
}

const CACHE_READ_MULTIPLIER = 0.1
const CACHE_WRITE_MULTIPLIER = 1.25

/** Rate is config, not a constant — it moves, and billing must not silently drift. */
const USD_TO_INR = Number(process.env.USD_TO_INR ?? 88)

/**
 * Cost of one call, in paise. Integer paise (not float rupees) so summing
 * thousands of rows for an invoice doesn't accumulate rounding error.
 */
export function costPaise(model: string, usage: AiUsage): number {
  const price = PRICING[model]
  if (!price) return 0

  const perToken = (rate: number) => rate / 1_000_000

  const usd =
    usage.inputTokens * perToken(price.input) +
    usage.outputTokens * perToken(price.output) +
    usage.cacheReadTokens * perToken(price.input) * CACHE_READ_MULTIPLIER +
    usage.cacheWriteTokens * perToken(price.input) * CACHE_WRITE_MULTIPLIER

  return Math.round(usd * USD_TO_INR * 100)
}

/**
 * Per-feature model routing.
 *
 * Nothing here justifies a frontier model: the chatbot answers "which BBA
 * should I take?", and the generators produce a resume from structured profile
 * data. Routing everything to the top tier is how an AI bill reaches ₹90k/month
 * for work a budget model does indistinguishably well.
 *
 * Override per feature via env, e.g. AI_MODEL_SOP=claude-opus-4-8.
 */
type Route = { model: string; effort: AiEffort; maxTokens: number }

/**
 * `maxTokens` is a cost lever, not just a safety rail. Output is priced 5x
 * input on every model here, so on the generators the reply IS the bill —
 * ~80% of a resume's cost is the resume it writes, not the profile it reads.
 * Capping length is the single biggest saving that doesn't change vendor.
 */
const BALANCED: Record<AiFeature, Route> = {
  chatbot: { model: 'claude-haiku-4-5', effort: 'low', maxTokens: 700 },
  career: { model: 'claude-haiku-4-5', effort: 'low', maxTokens: 700 },
  notes: { model: 'claude-haiku-4-5', effort: 'low', maxTokens: 900 },
  roadmap: { model: 'claude-haiku-4-5', effort: 'medium', maxTokens: 900 },
  purpose: { model: 'claude-haiku-4-5', effort: 'medium', maxTokens: 700 },
  tutor: { model: 'claude-sonnet-5', effort: 'medium', maxTokens: 900 },
  resume: { model: 'claude-sonnet-5', effort: 'medium', maxTokens: 900 },
  sop: { model: 'claude-sonnet-5', effort: 'high', maxTokens: 1000 },
  interview: { model: 'claude-sonnet-5', effort: 'high', maxTokens: 900 },
  // A wrong answer key ships a broken exam, so this stays on the mid tier rather
  // than the cheapest. maxTokens is set per-call from the requested count.
  assessment: { model: 'claude-sonnet-5', effort: 'medium', maxTokens: 2200 },
}

/**
 * Economy profile. Moves everything that tolerates it onto the cheapest
 * capable tier — `gpt-5.4-nano` is ~5x cheaper than anything Anthropic sells.
 *
 * SOP and interview prep deliberately stay on a mid tier: those outputs are
 * read by admissions officers and hiring panels, and a visibly weaker SOP
 * costs a student an admission. Saving ₹0.80 there is a false economy.
 */
const ECONOMY: Record<AiFeature, Route> = {
  chatbot: { model: 'gpt-5.4-nano', effort: 'low', maxTokens: 600 },
  career: { model: 'gpt-5.4-nano', effort: 'low', maxTokens: 600 },
  notes: { model: 'gpt-5.4-nano', effort: 'low', maxTokens: 800 },
  purpose: { model: 'gpt-5.4-nano', effort: 'low', maxTokens: 600 },
  roadmap: { model: 'gpt-5.6-luna', effort: 'low', maxTokens: 800 },
  tutor: { model: 'gpt-5.6-luna', effort: 'medium', maxTokens: 800 },
  resume: { model: 'gpt-5.6-luna', effort: 'medium', maxTokens: 800 },
  sop: { model: 'gpt-5.6-terra', effort: 'high', maxTokens: 900 },
  interview: { model: 'gpt-5.6-terra', effort: 'high', maxTokens: 800 },
  assessment: { model: 'gpt-5.6-luna', effort: 'medium', maxTokens: 2000 },
}

/** `balanced` (default) or `economy`. Switchable without a deploy. */
export function routeFor(feature: AiFeature): Route {
  const profile = (process.env.AI_COST_PROFILE ?? 'balanced').toLowerCase()
  const base = (profile === 'economy' ? ECONOMY : BALANCED)[feature]

  // Per-feature override wins over the profile, so you can keep one feature
  // on a better model while the rest run economy.
  const model = process.env[`AI_MODEL_${feature.toUpperCase()}`] ?? base.model
  const cap = Number(process.env[`AI_MAXTOKENS_${feature.toUpperCase()}`])
  return { ...base, model, maxTokens: Number.isFinite(cap) && cap > 0 ? cap : base.maxTokens }
}
