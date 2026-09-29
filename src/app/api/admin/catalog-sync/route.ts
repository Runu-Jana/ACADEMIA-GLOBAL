import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminApi, badRequest, zodMessage, readJson } from '../_lib/guard'
import { syncUniversity } from '@/lib/directory-sync'
import { isFeatureConfigured } from '@/lib/ai'

export const dynamic = 'force-dynamic'
// A live scrape + extraction can be slow.
export const maxDuration = 300

const patchSchema = z.object({
  universityId: z.string().trim().min(1),
  sourceUrl: z.string().trim().max(500).optional(),
  syncEnabled: z.boolean().optional(),
})

/** Set a university's official source URL and/or toggle auto-sync. */
export async function PATCH(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  const parsed = patchSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  const { universityId, sourceUrl, syncEnabled } = parsed.data
  const university = await prisma.university.update({
    where: { id: universityId },
    data: {
      ...(sourceUrl !== undefined && { sourceUrl: sourceUrl || null }),
      ...(syncEnabled !== undefined && { syncEnabled }),
    },
    select: { id: true, sourceUrl: true, syncEnabled: true },
  })
  return NextResponse.json({ ok: true, university })
}

const postSchema = z.object({ universityId: z.string().trim().min(1) })

/** Run the sync now for one university. */
export async function POST(req: Request) {
  const { user, response } = await requireAdminApi()
  if (!user) return response

  if (!isFeatureConfigured('notes')) {
    return NextResponse.json(
      { error: 'AI extraction is not configured. Add an API key to enable syncing.', code: 'ai_unconfigured' },
      { status: 503 },
    )
  }

  const parsed = postSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(zodMessage(parsed.error))

  try {
    const result = await syncUniversity(parsed.data.universityId)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Sync failed.')
  }
}
