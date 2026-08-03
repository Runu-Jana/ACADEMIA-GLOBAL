import { NextResponse } from 'next/server'
import { promoteClaimable } from '@/lib/commission'

export const dynamic = 'force-dynamic'

/**
 * Scheduled maintenance endpoint.
 *
 * The commission lifecycle needs a daily nudge — `promoteClaimable` moves
 * commissions past their cool-off window from PENDING to CLAIMABLE. There's no
 * in-app scheduler, so an external cron (Vercel Cron, cron-job.org, GitHub
 * Actions, a server crontab, …) should hit this once a day with the shared
 * secret. Without CRON_SECRET set it refuses to run, so it can't be triggered
 * anonymously.
 *
 * Wire it up: schedule a daily request to
 *   GET https://<your-domain>/api/cron
 *   Authorization: Bearer <CRON_SECRET>
 */

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const header = bearer || req.headers.get('x-cron-secret') || ''
  // Length check first so the equality comparison is over equal-length strings.
  return header.length === secret.length && header === secret
}

async function handle(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Cron is not configured. Set CRON_SECRET to enable scheduled maintenance.' },
      { status: 503 },
    )
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const commissions = await promoteClaimable()
  return NextResponse.json({ ok: true, ...commissions })
}

// Cron services use GET; POST is accepted too for flexibility.
export const GET = handle
export const POST = handle
