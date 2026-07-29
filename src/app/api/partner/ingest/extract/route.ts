import { NextResponse } from 'next/server'
import { requireActivePartnerApi } from '../../_lib/guard'
import { extractProgrammes, pdfToText } from '@/lib/ai/ingest'
import { isFeatureConfigured } from '@/lib/ai'

export const maxDuration = 300 // extraction over a long prospectus is slow

const MAX_BYTES = 20 * 1024 * 1024

/**
 * Partner prospectus → structured programmes for review.
 *
 * Same extraction the operator uses, scoped to a partner. Writes nothing: the
 * partner reviews the model's output and then commits it as drafts, which still
 * pass through operator review before going live. Model output about a real
 * institution's fees is never trusted blind.
 */
export async function POST(req: Request) {
  const { user, response } = await requireActivePartnerApi()
  if (!user) return response

  // Ingestion routes through the 'notes' model tier — check that's configured
  // before we take an upload we can't process.
  if (!isFeatureConfigured('notes')) {
    return NextResponse.json(
      {
        error:
          'AI ingestion isn’t configured on this environment yet. Add programmes manually, or ask an admin to enable AI.',
        code: 'ai_unconfigured',
      },
      { status: 503 },
    )
  }

  let text = ''
  const contentType = req.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Attach a PDF or text file.' }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File is too large (limit 20 MB).' }, { status: 400 })
      }
      const buf = Buffer.from(await file.arrayBuffer())
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      text = isPdf ? await pdfToText(buf) : buf.toString('utf8')
    } else {
      const body = await req.json()
      text = typeof body?.text === 'string' ? body.text : ''
    }
  } catch {
    return NextResponse.json({ error: 'Could not read that document.' }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json(
      {
        error:
          'No readable text found. Scanned PDFs need OCR first — paste the text instead if you have it.',
      },
      { status: 400 },
    )
  }

  try {
    const { result, warnings } = await extractProgrammes(text, { userId: user.id })
    return NextResponse.json({
      ok: true,
      warnings,
      count: result.programmes.length,
      programmes: result.programmes,
      // Echoed back on commit so a stale or tampered preview can't quietly write
      // a different set of programmes than the partner reviewed.
      reviewToken: String(result.programmes.length),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
