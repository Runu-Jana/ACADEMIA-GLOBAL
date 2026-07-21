import Anthropic from '@anthropic-ai/sdk'
import type { AiProvider, AiRequest, AiResult, AiStream, AiUsage } from './types'

/**
 * Anthropic adapter.
 *
 * Capability gating matters here: `output_config.effort` and adaptive thinking
 * exist on the 4.6+ / 5 generation but NOT on Haiku 4.5 — sending either to
 * Haiku returns a 400. Since the routing table deliberately sends high-volume
 * features to Haiku for cost, the adapter has to check before it sends.
 */
const SUPPORTS_EFFORT_AND_ADAPTIVE =
  /^claude-(opus-4-[678]|sonnet-5|sonnet-4-6|fable-5|mythos-5)/

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

function readUsage(u: {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}): AiUsage {
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  }
}

/** Builds the request body, applying only the parameters this model accepts. */
function buildParams(model: string, req: AiRequest) {
  const modern = SUPPORTS_EFFORT_AND_ADAPTIVE.test(model)

  const params: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? 4096,
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
  }

  if (req.system) {
    // Array form (not a bare string) so the stable prefix can carry
    // cache_control. Below ~2-4k tokens this silently won't cache — that's a
    // no-op, not an error.
    params.system = [
      { type: 'text', text: req.system, cache_control: { type: 'ephemeral' } },
    ]
  }

  const outputConfig: Record<string, unknown> = {}
  if (modern && req.effort) outputConfig.effort = req.effort
  if (req.schema) outputConfig.format = { type: 'json_schema', schema: req.schema }
  if (Object.keys(outputConfig).length) params.output_config = outputConfig

  // Opus 4.8 runs WITHOUT thinking unless adaptive is set explicitly — omitting
  // the field is not the same as enabling it.
  if (modern) params.thinking = { type: 'adaptive' }

  // Note: temperature / top_p / top_k are rejected on this generation.
  // Steer with prompting instead.
  return params
}

function firstText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
}

export const anthropicProvider: AiProvider = {
  name: 'anthropic',

  async complete(model, req): Promise<AiResult> {
    const started = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await client().messages.create(buildParams(model, req) as any)

    if (res.stop_reason === 'refusal') {
      throw new Error('The model declined this request.')
    }

    return {
      text: firstText(res.content ?? []),
      usage: readUsage(res.usage ?? {}),
      model: res.model ?? model,
      provider: 'anthropic',
      latencyMs: Date.now() - started,
    }
  },

  async stream(model, req): Promise<AiStream> {
    const started = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = client().messages.stream(buildParams(model, req) as any)

    async function* textStream() {
      for await (const event of s) {
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta'
        ) {
          yield event.delta.text as string
        }
      }
    }

    return {
      textStream: textStream(),
      // finalMessage() resolves the accumulated message — don't hand-roll
      // promise wrapping around stream events; the SDK handles completion,
      // error and abort internally.
      final: async () => {
        const msg = await s.finalMessage()
        return {
          text: firstText(msg.content ?? []),
          usage: readUsage(msg.usage ?? {}),
          model: msg.model ?? model,
          provider: 'anthropic',
          latencyMs: Date.now() - started,
        }
      },
    }
  },
}
