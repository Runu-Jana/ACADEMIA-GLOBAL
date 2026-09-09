import { NextResponse } from 'next/server'
import { searchAll } from '@/lib/search'

export const dynamic = 'force-dynamic'

/**
 * Typeahead backend for the header search box. Returns a handful of hits per
 * group (courses / universities / products / exams) for the dropdown; the full
 * `/search` page queries `searchAll` directly with larger caps.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const results = await searchAll(q)
  return NextResponse.json(results)
}
