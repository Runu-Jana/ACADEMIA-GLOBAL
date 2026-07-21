import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST(req: Request) {
  await destroySession()
  // 303 so the browser follows the redirect with GET after the form POST.
  return NextResponse.redirect(new URL('/', req.url), { status: 303 })
}
