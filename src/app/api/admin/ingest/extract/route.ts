import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { extractProgrammes, pdfToText } from '@/lib/ai/ingest'

export const maxDuration = 300 // extraction over a long prospectus is slow

const MAX_BYTES = 20 * 1024 * 1024

/**
 * Reads a prospectus and returns structured programmes for review.
 *
 * This endpoint deliberately writes NOTHING. Extraction is model output about
 * a real institution's fees and eligibility rules — it goes in front of a
 * human before it goes in the catalogue. Committing is a separate, explicit
 * call.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
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
    const { result, chunks, warnings } = await extractProgrammes(text, { userId: user.id })
    return NextResponse.json({
      ok: true,
      chunks,
      warnings,
      count: result.programmes.length,
      programmes: result.programmes,
      // The client must echo this back on commit, so a stale or tampered
      // preview can't quietly write a different number of courses.
      reviewToken: String(result.programmes.length),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
