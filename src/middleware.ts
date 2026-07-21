import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { SESSION_COOKIE } from '@/lib/constants'

const PROTECTED = ['/dashboard', '/apply']
const ADMIN_ONLY = ['/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p))
  const needsAdmin = ADMIN_ONLY.some((p) => pathname.startsWith(p))
  if (!needsAuth && !needsAdmin) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  if (needsAdmin && session.role !== 'ADMIN') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/apply/:path*'],
}
