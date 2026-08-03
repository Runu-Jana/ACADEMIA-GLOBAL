import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { readJson } from '@/app/api/admin/_lib/guard'
import { requestLiveAgent } from '@/lib/live-agent'
import { HANDOFF_REPLY } from '../_lib/recommend'

export const dynamic = 'force-dynamic'

const schema = z.object({
  leadId: z.string().trim().max(40).optional(),
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().max(1000).optional(),
})

/**
 * Explicit "Connect with a live agent" action from the Saarthi chat. Flags the
 * prospect's lead, logs a note and emails the admin so a counsellor can call
 * back. Idempotent — a second click won't re-notify.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  }

  const user = await getCurrentUser()
  const result = await requestLiveAgent({
    leadId: parsed.data.leadId,
    user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    message: parsed.data.message,
  })

  if (!result.ok) {
    const error =
      result.reason === 'no_contact'
        ? 'Please share your name and email first so a counsellor can reach you.'
        : 'We could not find your details. Please try again.'
    return NextResponse.json({ error }, { status: result.reason === 'no_contact' ? 400 : 404 })
  }

  return NextResponse.json({ ok: true, reply: HANDOFF_REPLY, alreadyRequested: result.alreadyRequested })
}
