import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth'

/**
 * Re-verifies the session inside the route handler.
 *
 * `middleware.ts` only guards page navigations under /admin — API routes are
 * reachable directly, so every mutating handler must call this itself and never
 * trust anything the client sent about who it is.
 *
 * Returns the admin user, or a ready-to-return NextResponse on failure.
 */
export async function requireAdminApi() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'You are not signed in.' }, { status: 401 }),
    } as const
  }

  if (user.role !== 'ADMIN') {
    return {
      user: null,
      response: NextResponse.json({ error: 'Admin access is required.' }, { status: 403 }),
    } as const
  }

  return { user, response: null } as const
}

/** First zod message, so the client shows something human. */
export function zodMessage(error: ZodError, fallback = 'Please check the details you entered.') {
  return error.errors[0]?.message ?? fallback
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Not found.') {
  return NextResponse.json({ error: message }, { status: 404 })
}

/** Parses a JSON body without throwing on malformed input. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
