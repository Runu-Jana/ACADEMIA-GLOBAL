import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi, badRequest, zodMessage, readJson } from '../../_lib/guard'
import { isFeatureConfigured } from '@/lib/ai'
import { extractProgrammes } from '@/lib/ai/ingest'
import { fetchPageText } from '@/lib/ai/scrape'

export const dynamic = 'force-dynamic'
// Fetching a page and extracting from it can be slow.
export const maxDuration = 300

const schema = z
  .object({
    url: z.string().trim().max(500).optional(),
    text: z.string().trim().max(200_000).optional(),
  })
  .refine((d) => d.url || d.text, { message: 'Provide a URL or paste the page text.' })

/**
 * Scrapes a university page (or accepts pasted text) and extracts programmes for
 * review. Writes NOTHING — like the partner ingest, extraction is model output
 * about a real institution and goes in front of a human before the catalogue.
 */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  if (!isFeatureConfigured('notes')) {
    return NextResponse.json(
      { error: 'AI extraction is not configured. Add an API key to enable it.', code: 'ai_unconfigured' },
      { status: 503 },
    )
  }

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  let text = parsed.data.text ?? ''
  let sourceUrl: string | null = null

  if (parsed.data.url) {
    try {
      text = await fetchPageText(parsed.data.url)
      sourceUrl = parsed.data.url
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : 'Could not read that page.')
    }
  }

  if (text.trim().length < 200) {
    return badRequest('There isn’t enough readable text to extract programmes from.')
  }

  try {
    const { result, warnings } = await extractProgrammes(text, { userId: user.id })
    return NextResponse.json({
      ok: true,
      programmes: result.programmes,
      warnings,
      sourceUrl,
      reviewToken: String(result.programmes.length),
      count: result.programmes.length,
    })
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Extraction failed.')
  }
}
