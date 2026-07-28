import { prisma } from '@/lib/prisma'
import { anthropicProvider } from './anthropic'
import { openaiProvider } from './openai'
import { costPaise, routeFor, type AiFeature, type AiProvider, type AiRequest, type AiResult, type AiStream } from './types'

export * from './types'

/**
 * The only entry point features use.
 *
 * Routes to the right model, calls whichever vendor owns it, and writes one
 * metering row per call. Metering is not optional plumbing — without it, AI
 * is an invisible monthly cost you absorb; with it, it's a line item you bill.
 */

const PROVIDERS: Record<string, AiProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
}

function providerNameFor(model: string): 'openai' | 'anthropic' {
  return model.startsWith('gpt-') || model.startsWith('o') ? 'openai' : 'anthropic'
}

function providerFor(model: string): AiProvider {
  const provider = PROVIDERS[providerNameFor(model)]
  if (!provider) throw new Error(`No provider registered for model "${model}"`)
  return provider
}

/**
 * Whether the provider a feature routes to actually has a key.
 *
 * Lets a route return a clean "AI isn't configured" before it commits to a
 * streaming response — the provider adapters only throw lazily, on first call,
 * which is too late once the response headers are already on the wire.
 */
export function isFeatureConfigured(feature: AiFeature): boolean {
  const name = providerNameFor(routeFor(feature).model)
  return name === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY)
}

export interface AiContext {
  userId?: string | null
  courseId?: string | null
}

/** Per-user hourly call cap. A runaway client loop should cost rupees, not lakhs. */
const HOURLY_LIMIT = Number(process.env.AI_HOURLY_LIMIT ?? 60)

export async function assertWithinRateLimit(userId?: string | null) {
  if (!userId) return
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const used = await prisma.aiUsageLog.count({ where: { userId, createdAt: { gte: since } } })
  if (used >= HOURLY_LIMIT) {
    throw new Error("You've reached this hour's AI usage limit. Please try again shortly.")
  }
}

async function meter(feature: AiFeature, result: AiResult, ctx: AiContext) {
  try {
    await prisma.aiUsageLog.create({
      data: {
        feature,
        model: result.model,
        provider: result.provider,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheReadTokens: result.usage.cacheReadTokens,
        cacheWriteTokens: result.usage.cacheWriteTokens,
        costPaise: costPaise(result.model, result.usage),
        latencyMs: result.latencyMs,
        userId: ctx.userId ?? null,
        courseId: ctx.courseId ?? null,
      },
    })
  } catch {
    // Metering must never take down the feature the student is using.
    // A dropped row costs a billing entry; a thrown error costs the answer.
  }
}

export async function runAi(
  feature: AiFeature,
  req: AiRequest,
  ctx: AiContext = {},
): Promise<AiResult> {
  await assertWithinRateLimit(ctx.userId)

  const route = routeFor(feature)
  // Explicit caller values win over the routing defaults; an absent field
  // falls back rather than overwriting with undefined.
  const merged = {
    ...req,
    effort: req.effort ?? route.effort,
    maxTokens: req.maxTokens ?? route.maxTokens,
  }
  const result = await providerFor(route.model).complete(route.model, merged)
  await meter(feature, result, ctx)
  return result
}

export async function streamAi(
  feature: AiFeature,
  req: AiRequest,
  ctx: AiContext = {},
): Promise<AiStream> {
  await assertWithinRateLimit(ctx.userId)

  const route = routeFor(feature)
  const stream = await providerFor(route.model).stream(route.model, {
    ...req,
    effort: req.effort ?? route.effort,
    maxTokens: req.maxTokens ?? route.maxTokens,
  })

  return {
    textStream: stream.textStream,
    final: async () => {
      const result = await stream.final()
      await meter(feature, result, ctx)
      return result
    },
  }
}

/** Spend rollup for the admin dashboard and for invoicing the client. */
export async function aiSpendSummary(since?: Date) {
  const where = since ? { createdAt: { gte: since } } : {}

  const [total, byFeature] = await Promise.all([
    prisma.aiUsageLog.aggregate({ where, _sum: { costPaise: true }, _count: true }),
    prisma.aiUsageLog.groupBy({
      by: ['feature'],
      where,
      _sum: { costPaise: true, inputTokens: true, outputTokens: true },
      _count: true,
    }),
  ])

  return {
    totalPaise: total._sum.costPaise ?? 0,
    totalCalls: total._count,
    byFeature: byFeature
      .map((f) => ({
        feature: f.feature,
        calls: f._count,
        costPaise: f._sum.costPaise ?? 0,
        inputTokens: f._sum.inputTokens ?? 0,
        outputTokens: f._sum.outputTokens ?? 0,
      }))
      .sort((a, b) => b.costPaise - a.costPaise),
  }
}
