import OpenAI from 'openai'
import type { AiProvider, AiRequest, AiResult, AiStream, AiUsage } from './types'

/**
 * OpenAI adapter — same contract as the Anthropic one, so routing a feature to
 * either vendor is a table edit rather than a code change.
 *
 * Kept deliberately on the stable chat-completions shape; the point of this
 * file is portability, not using every provider-specific feature.
 */

function client() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey })
}

function readUsage(u?: {
  prompt_tokens?: number
  completion_tokens?: number
  prompt_tokens_details?: { cached_tokens?: number } | null
}): AiUsage {
  const cached = u?.prompt_tokens_details?.cached_tokens ?? 0
  return {
    // OpenAI reports cached tokens *inside* prompt_tokens; our cost model bills
    // them separately, so subtract them out to avoid double-counting.
    inputTokens: Math.max(0, (u?.prompt_tokens ?? 0) - cached),
    outputTokens: u?.completion_tokens ?? 0,
    cacheReadTokens: cached,
    cacheWriteTokens: 0, // OpenAI caches implicitly; no separate write charge
  }
}

function toMessages(req: AiRequest) {
  const msgs: Array<{ role: string; content: string }> = []
  if (req.system) msgs.push({ role: 'system', content: req.system })
  for (const m of req.messages) msgs.push({ role: m.role, content: m.content })
  return msgs
}

function buildParams(model: string, req: AiRequest) {
  const params: Record<string, unknown> = {
    model,
    messages: toMessages(req),
    max_completion_tokens: req.maxTokens ?? 4096,
  }
  if (req.schema) {
    params.response_format = {
      type: 'json_schema',
      json_schema: { name: 'result', schema: req.schema, strict: true },
    }
  }
  return params
}

export const openaiProvider: AiProvider = {
  name: 'openai',

  async complete(model, req): Promise<AiResult> {
    const started = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await client().chat.completions.create(buildParams(model, req) as any)

    return {
      text: (res.choices?.[0]?.message?.content ?? '').trim(),
      usage: readUsage(res.usage),
      model: res.model ?? model,
      provider: 'openai',
      latencyMs: Date.now() - started,
    }
  },

  async stream(model, req): Promise<AiStream> {
    const started = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = await client().chat.completions.create({
      ...buildParams(model, req),
      stream: true,
      stream_options: { include_usage: true },
    } as any)

    let text = ''
    let usage: AiUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }
    let done: () => void = () => {}
    const finished = new Promise<void>((r) => {
      done = r
    })

    async function* textStream() {
      for await (const chunk of s) {
        const delta = chunk.choices?.[0]?.delta?.content
        if (delta) {
          text += delta
          yield delta as string
        }
        // The usage chunk arrives last, after choices are empty.
        if (chunk.usage) usage = readUsage(chunk.usage)
      }
      done()
    }

    return {
      textStream: textStream(),
      final: async () => {
        await finished
        return {
          text: text.trim(),
          usage,
          model,
          provider: 'openai',
          latencyMs: Date.now() - started,
        }
      },
    }
  },
}
