import OpenAI from 'openai'
import { prisma } from '../prisma'
import { costPaise } from './types'

/**
 * Embeddings for the course-aware tutor's retrieval index.
 *
 * Deliberately optional. Generation (the tutor's answers) runs on Anthropic;
 * Anthropic sells no embeddings model, so semantic retrieval borrows OpenAI's
 * cheapest embedder. If no OpenAI key is configured, this returns null and the
 * retriever falls back to lexical scoring — the tutor still works on an
 * Anthropic-only deployment, just without vector similarity. One key gets you a
 * working tutor; the second key upgrades retrieval quality.
 */

/** Small + cheap ($0.02/M tokens). Overridable, e.g. text-embedding-3-large. */
const EMBED_MODEL = process.env.AI_EMBED_MODEL ?? 'text-embedding-3-small'

/** OpenAI caps a single embeddings request; batch below it to stay safe. */
const BATCH = 96

export function embeddingsAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

/** The model an index was built with must match the one a query is embedded
 *  with, or cosine distance is meaningless. Stored per chunk so a model change
 *  is detectable rather than silently corrupting retrieval. */
export function embedModel(): string {
  return EMBED_MODEL
}

async function meter(totalTokens: number, latencyMs: number, ctx: EmbedContext) {
  try {
    await prisma.aiUsageLog.create({
      data: {
        // Not an AiFeature route (embeddings aren't a chat model), but the
        // spend is real and belongs in the same ledger as everything else.
        feature: 'embed',
        model: EMBED_MODEL,
        provider: 'openai',
        inputTokens: totalTokens,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        costPaise: costPaise(EMBED_MODEL, {
          inputTokens: totalTokens,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        }),
        latencyMs,
        userId: ctx.userId ?? null,
        courseId: ctx.courseId ?? null,
      },
    })
  } catch {
    // Metering must never break indexing or a student's question.
  }
}

export interface EmbedContext {
  userId?: string | null
  courseId?: string | null
}

/**
 * Embeds many texts, preserving input order.
 *
 * Returns null when no OpenAI key is set — the caller treats that as "semantic
 * retrieval unavailable" and degrades to lexical. A thrown error means the key
 * was present but the call failed; callers decide whether that's fatal
 * (indexing can fall back; a live query already has a lexical path).
 */
export async function embed(
  texts: string[],
  ctx: EmbedContext = {},
): Promise<number[][] | null> {
  if (!texts.length) return []
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const client = new OpenAI({ apiKey })
  const out: number[][] = []
  let totalTokens = 0
  const started = Date.now()

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH).map((t) => t.replace(/\n/g, ' ').slice(0, 8000))
    const res = await client.embeddings.create({ model: EMBED_MODEL, input: batch })
    // The API returns data indexed by position, but sort defensively.
    const ordered = [...res.data].sort((a, b) => a.index - b.index)
    for (const d of ordered) out.push(d.embedding as number[])
    totalTokens += res.usage?.total_tokens ?? 0
  }

  await meter(totalTokens, Date.now() - started, ctx)
  return out
}

/** Convenience for the single query vector at retrieval time. */
export async function embedOne(text: string, ctx: EmbedContext = {}): Promise<number[] | null> {
  const res = await embed([text], ctx)
  return res ? (res[0] ?? null) : null
}
