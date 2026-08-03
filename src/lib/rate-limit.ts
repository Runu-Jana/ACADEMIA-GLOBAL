import { NextResponse } from 'next/server'

/**
 * Lightweight in-memory rate limiter (fixed window).
 *
 * This guards a single running instance: it stops burst abuse of the public and
 * auth endpoints (lead/email spam, login brute-force, AI-cost loops) without any
 * external dependency. It does NOT share state across processes, so on a
 * multi-instance / serverless deploy each instance limits independently — for
 * hard global limits there, swap this store for Redis/Upstash. It's a real first
 * line of defence, not a distributed guarantee.
 */

type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()

// Opportunistic cleanup so the map can't grow without bound.
let lastSweep = 0
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of store) if (bucket.resetAt <= now) store.delete(key)
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfter: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  bucket.count += 1
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 }
}

/** Best-effort client IP from proxy headers, for keying anonymous limits. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Enforce a limit for `bucket` scoped to the caller. Returns a ready-to-send 429
 * NextResponse when exceeded, or null when the request may proceed.
 */
export function enforceRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
  id?: string,
): NextResponse | null {
  const key = `${bucket}:${id ?? clientIp(req)}`
  const res = rateLimit(key, limit, windowMs)
  if (res.ok) return null
  return NextResponse.json(
    { error: 'Too many requests — please slow down and try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(res.retryAfter) } },
  )
}

// Handy window constants.
export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
