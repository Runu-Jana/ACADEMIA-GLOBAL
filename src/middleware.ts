import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { SESSION_COOKIE } from '@/lib/constants'

// Student areas (any signed-in user), and the two role-scoped consoles.
const PROTECTED = ['/dashboard', '/apply']
const ADMIN_ONLY = ['/admin']
const PARTNER_ONLY = ['/partner']

/** Where each role belongs, so a user in the wrong console is sent home rather
 *  than bounced to a login they're already past. Kept inline (not imported from
 *  auth.ts) so middleware stays free of Node-only Prisma/bcrypt code. */
function homeFor(role: string): string {
  if (role === 'ADMIN') return '/admin'
  if (role === 'PARTNER') return '/partner'
  return '/dashboard'
}

/** Segment-safe prefix match: '/partner' matches '/partner' and '/partner/x'
 *  but never '/partners'. */
function underPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const needsAuth = underPrefix(pathname, PROTECTED)
  const needsAdmin = underPrefix(pathname, ADMIN_ONLY)
  const needsPartner = underPrefix(pathname, PARTNER_ONLY)
  if (!needsAuth && !needsAdmin && !needsPartner) return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  // Wrong console for this role → send them to their own home.
  const misplaced =
    (needsAdmin && session.role !== 'ADMIN') ||
    (needsPartner && session.role !== 'PARTNER') ||
    // Partners aren't students; keep them out of the learner areas entirely.
    (needsAuth && session.role === 'PARTNER')

  if (misplaced) {
    const url = req.nextUrl.clone()
    url.pathname = homeFor(session.role)
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/apply/:path*', '/partner/:path*'],
}
